"""`mft` command line entry point: black-box API test cycle for metricflow.

Phases:
  compose   reset+start postgres (docker compose, empty volume each run)
  server    start metricflow (uvicorn subprocess, CI-parity env) and wait healthy
  scenarios pytest suites against the live server (PAT auth)

Exit code = number of failed phases. `--keep` leaves database + server running.
"""

import argparse
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict

from watchmen_metricflow_test.report import write_summary
from watchmen_metricflow_test.server_manager import MetricFlowServerManager
from watchmen_metricflow_test.settings import MetricFlowTestSettings

COMPOSE_PROJECT = 'mft'


def _run_command(cmd, **kwargs):
	print(f'+ {" ".join(str(c) for c in cmd)}')
	return subprocess.run(cmd, **kwargs)


def _compose_cmd(settings: MetricFlowTestSettings, *args: str):
	return ['docker', 'compose', '-f', str(settings.compose_file), '-p', COMPOSE_PROJECT, *args]


def _volume_ready(settings: MetricFlowTestSettings) -> bool:
	"""True when a kept postgres container already has the seeded volume."""
	check = _run_command(
		['docker', 'exec', 'mft-postgres', 'psql', '-U', 'admin', '-d', 'watchmen',
		 '-tAc', "SELECT 1 FROM pats WHERE token = 'mft-pat-local-001'"],
		check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
	return check.returncode == 0


def _phase_compose(settings: MetricFlowTestSettings, fresh: bool = False) -> None:
	import shutil

	if shutil.which('docker') is None:
		raise RuntimeError('docker CLI not found on PATH')
	if not fresh and _volume_ready(settings):
		# reuse the initialized volume: full meta/data trees take minutes to apply
		_run_command(_compose_cmd(settings, 'up', '-d', '--wait'), timeout=300)
		if _volume_ready(settings):
			return 'reused existing initialized volume'
	_run_command(_compose_cmd(settings, 'down', '-v'), check=False)
	result = _run_command(_compose_cmd(settings, 'up', '-d', '--wait'), timeout=300)
	if result.returncode != 0:
		raise RuntimeError(f'docker compose up failed (exit {result.returncode})')


def _phase_wait_seed(settings: MetricFlowTestSettings) -> str:
	"""Wait until the seeded principal is visible AND postgres finished its
	entrypoint init phase (scripts keep executing after the pats row appears;
	starting the server too early dies on the temp->final server restart)."""
	deadline = time.monotonic() + 900  # full script trees take 5-10 min on laptops
	token_deadline = time.monotonic() + 480
	seeded = False
	while time.monotonic() < token_deadline:
		check = _run_command(
			['docker', 'exec', 'mft-postgres', 'psql', '-U', 'admin', '-d', 'watchmen',
			 '-tAc', "SELECT 1 FROM pats WHERE token = 'mft-pat-local-001'"],
			check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
		if check.returncode == 0:
			seeded = True
			break
		time.sleep(3)
	if not seeded:
		raise RuntimeError('seed principal not visible within 480s (schema init failed?)')

	quiet_needed = 4  # consecutive polls with no new init-script output
	quiet = 0
	last_size = -1
	while time.monotonic() < deadline:
		logs = _run_command(['docker', 'logs', '--tail', '5', 'mft-postgres'],
			check=False, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
		out = (logs.stdout or b'').decode('utf-8', errors='replace')
		size = len(out)
		still_init = 'Executing ./' in out
		if not still_init and size == last_size:
			quiet += 1
			if quiet >= quiet_needed:
				return 'seed principal ready + init quiet'
		else:
			quiet = 0
		last_size = size
		time.sleep(5)
	raise RuntimeError('postgres init did not go quiet within budget')


def _phase_scenarios(settings: MetricFlowTestSettings, results_dir: Path) -> Dict[str, str]:
	cmd = [
		sys.executable, '-m', 'pytest', 'scenarios',
		'-q', f'--junitxml={results_dir / "junit-scenarios.xml"}',
	]
	env = dict(os.environ)
	env.update({
		'MFT_BASE_URL': settings.base_url,
		'MFT_PAT_TOKEN': settings.pat_token,
		'MFT_MYSQL_HOST': settings.mysql_host,
		'MFT_MYSQL_PORT': str(settings.mysql_port),
		'MFT_MYSQL_USER': settings.mysql_user,
		'MFT_MYSQL_PASSWORD': settings.mysql_password,
		'MFT_MYSQL_DATABASE': settings.mysql_database,
	})
	result = _run_command(cmd, cwd=str(Path(__file__).resolve().parents[2]), env=env, timeout=1800)
	if result.returncode != 0:
		return {'status': 'fail', 'detail': f'scenarios failed (exit {result.returncode})'}
	return {'status': 'pass', 'detail': 'scenarios green'}


def main(argv=None) -> int:
	parser = argparse.ArgumentParser(prog='mft', description='watchmen metricflow api test-suite')
	sub = parser.add_subparsers(dest='command', required=True)
	run_parser = sub.add_parser('run', help='execute one full black-box test cycle')
	run_parser.add_argument('--suite', choices=['smoke', 'full'], default='full')
	run_parser.add_argument('--keep', action='store_true',
			help='leave postgres + server running after the run (debug aid)')
	run_parser.add_argument('--fresh', action='store_true',
			help='wipe the volume and re-apply all schema scripts (default: reuse)')
	run_parser.add_argument('--results-dir', default=None)
	args = parser.parse_args(argv)

	stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
	results_dir = Path(args.results_dir) if args.results_dir \
		else Path.cwd() / 'test-results' / f'{stamp}'
	settings = MetricFlowTestSettings()
	server = MetricFlowServerManager(settings, log_dir=results_dir)
	phases: Dict[str, Dict[str, str]] = {}

	def record(name, fn, *fn_args) -> None:
		try:
			detail = fn(*fn_args)
			phases[name] = {'status': 'pass', 'detail': detail or 'ok'}
			print(f'[mft] {name}: pass ({phases[name]["detail"]})')
		except Exception as e:
			phases[name] = {'status': 'fail', 'detail': str(e)}
			print(f'[mft] {name}: FAIL ({e})', file=sys.stderr)

	try:
		record('compose', _phase_compose, settings, args.fresh)
		record('db-seed', _phase_wait_seed, settings)

		if phases.get('db-seed', {}).get('status') == 'fail':
			phases['server'] = {'status': 'skip', 'detail': 'database not seeded'}
			phases['scenarios'] = {'status': 'skip', 'detail': 'database not seeded'}
		else:
			record('server', server.start)
			if phases.get('server', {}).get('status') == 'fail':
				phases['scenarios'] = {'status': 'skip', 'detail': 'server not available'}
			else:
				phases['scenarios'] = _phase_scenarios(settings, results_dir)
	finally:
		if args.keep:
			print('[mft] --keep set: postgres AND server left running.')
			print(f'      stop server : kill $(lsof -t -iTCP:{settings.server_port} -sTCP:LISTEN)')
			print(f'      tear down db: docker compose -f {settings.compose_file} -p {COMPOSE_PROJECT} down -v')
		else:
			server.stop()
			# keep the volume unless --fresh: re-running must not re-pay the
			# full multi-minute schema bootstrap
			teardown = _compose_cmd(settings, 'down', '-v') if args.fresh \
				else _compose_cmd(settings, 'down')
			_run_command(teardown, check=False)

	write_summary(results_dir, phases)
	failed = sum(1 for o in phases.values() if o.get('status') == 'fail')
	print(f'[mft] reports in {results_dir}')
	return failed


if __name__ == '__main__':
	sys.exit(main())
