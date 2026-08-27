"""`wht` command line entry point: orchestrates one full-stack e2e run.

Phases (each reported pass/fail/skip):
  compose      reset+start database stack (docker compose)
  db-scripts   apply meta/data scripts via DbBootstrapper
  server       start doll server and wait for /health
  newman       optional Postman collection run (skipped when node/newman absent)
  scenarios    pytest functional suites against the live server

Exit code = number of failed phases. `--keep` leaves the stack running for manual
inspection; a kept run MUST be torn down (`make down`) before the next run because
scripts expect an empty schema.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Dict, List

from watchmen_test_harness.db_bootstrapper import DbBootstrapper
from watchmen_test_harness.report import write_summary
from watchmen_test_harness.server_manager import DollServerManager
from watchmen_test_harness.settings import HarnessSettings

COMPOSE_PROJECT = 'wht'
SUPPORTED_DBS = ['mysql']


def _run_command(cmd: List[str], **kwargs) -> subprocess.CompletedProcess:
	print(f'+ {" ".join(cmd)}')
	return subprocess.run(cmd, **kwargs)


def _compose_cmd(settings: HarnessSettings, *args: str) -> List[str]:
	return [
		'docker', 'compose', '-f', str(settings.compose_file),
		'-p', COMPOSE_PROJECT, *args,
	]


def _phase_compose(settings: HarnessSettings) -> None:
	if shutil.which('docker') is None:
		raise RuntimeError('docker CLI not found on PATH; install Docker Desktop or engine')
	_run_command(_compose_cmd(settings, 'down', '-v'), check=False)
	result = _run_command(_compose_cmd(settings, 'up', '-d', '--wait'), timeout=300)
	if result.returncode != 0:
		raise RuntimeError(f'docker compose up failed (exit {result.returncode})')


def _teardown_compose(settings: HarnessSettings) -> None:
	_run_command(_compose_cmd(settings, 'down', '-v'), check=False)


def _phase_db_scripts(settings: HarnessSettings) -> str:
	bootstrapper = DbBootstrapper(settings)
	bootstrapper.wait_until_ready()
	bootstrapper.apply_session_flags()
	applied = bootstrapper.apply_scripts()
	return f'{len(applied)} script(s) applied'


def _phase_newman(settings: HarnessSettings, results_dir: Path, skip_newman: bool) -> Dict[str, str]:
	if skip_newman:
		return {'status': 'skip', 'detail': 'requested via --skip-newman'}
	if shutil.which('newman') is None:
		return {'status': 'skip', 'detail': 'newman not found on PATH (node not installed?)'}
	repo = settings.doll_dir.parents[1]
	orig_collection = repo / 'packages' / 'watchmen-test-postman'
	env_file = _derived_postman_env(settings, orig_collection / 'mysql.json', results_dir)
	collection_file = _derived_postman_collection(settings, orig_collection / 'watchmen-postman.json', results_dir)
	result = _run_command(
		[
			'newman', 'run', str(collection_file),
			'-e', str(env_file),
			'--bail', '-r', 'cli,htmlextra',
			'--reporter-htmlextra-export', str(results_dir / 'postman-report.html'),
			'--delay-request', '200',
		],
		cwd=str(repo), timeout=3600,
	)
	if result.returncode != 0:
		return {'status': 'fail', 'detail': f'postman collection failed (exit {result.returncode})'}
	return {'status': 'pass', 'detail': 'collection green'}


def _derived_postman_env(settings: HarnessSettings, source: Path, results_dir: Path) -> Path:
	"""Rewrites the checked-in postman env so URL_PREFIX points at OUR server.

	The upstream file hardcodes http://localhost:8000 (CI's port); the harness may run
	the doll elsewhere (e.g. WHT_SERVER_PORT=8010 to avoid a dev instance). Empties are
	left untouched; the original file is never modified.
	"""
	data = json.loads(source.read_text(encoding='utf-8'))
	# some templated datasource bodies use these as standalone fields; a literal
	# host 'localhost' makes pymysql open a local unix socket against whatever
	# mysql runs on the dev machine itself
	direct_keys = {
		'DATASOURCE_HOST': settings.mysql_host,
		'DATASOURCE_PORT': str(settings.mysql_port),
	}
	for item in data.get('values', []):
		key = item.get('key')
		if key in direct_keys:
			item['value'] = direct_keys[key]
			continue
		value = item.get('value')
		if not isinstance(value, str):
			continue
		# checked-in env hardcodes CI's server port and database port; a dev machine
		# often has its own MySQL on 3306, which would silently receive our traffic
		if 'http://localhost:8000' in value:
			value = value.replace('http://localhost:8000', settings.base_url)
		if '@127.0.0.1:3306/' in value:
			value = value.replace(f'@127.0.0.1:3306/', f'@{settings.mysql_host}:{settings.mysql_port}/')
		item['value'] = value
	target = results_dir / f'{source.stem}-derived.json'
	results_dir.mkdir(parents=True, exist_ok=True)
	target.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
	return target


def _derived_postman_collection(settings: HarnessSettings, source: Path, results_dir: Path) -> Path:
	"""Collection copy whose hardcoded host:port literals follow the harness runtime.

	Some legacy request bodies embed 127.0.0.1:3306 literally instead of using env
	variables; on a dev machine with its own MySQL on 3306 those requests would hit
	the wrong server (CI runners are clean, so upstream never noticed). A uniform
	text rewrite over the JSON is safe here because the pattern only appears inside
	connection strings/ports.
	"""
	def rewrite(node):
		if isinstance(node, dict):
			return {k: rewrite(v) for k, v in node.items()}
		if isinstance(node, list):
			return [rewrite(v) for v in node]
		if isinstance(node, str):
			node = node.replace('@127.0.0.1:3306/', f'@{settings.mysql_host}:{settings.mysql_port}/')
			node = node.replace('"port": "3306"', f'"port": "{settings.mysql_port}"')
			node = node.replace('\\"port\\": \\"3306\\"', f'\\"port\\": \\"{settings.mysql_port}\\"')
			return node
		return node

	data = json.loads(source.read_text(encoding='utf-8'))
	target = results_dir / f'{source.stem}-derived.json'
	results_dir.mkdir(parents=True, exist_ok=True)
	target.write_text(json.dumps(rewrite(data), ensure_ascii=False), encoding='utf-8')
	return target


def _phase_scenarios(
		settings: HarnessSettings, results_dir: Path, suite: str
) -> Dict[str, str]:
	cmd = [
		sys.executable, '-m', 'pytest', 'scenarios',
		'-q', f'--junitxml={results_dir / "junit-scenarios.xml"}',
	]
	if suite == 'smoke':
		cmd += ['-m', 'smoke']
	env = dict(os.environ)
	env.update({
		'WHT_BASE_URL': settings.base_url,
		'WHT_ADMIN_USER': settings.admin_user,
		'WHT_ADMIN_PASSWORD': settings.admin_password,
	})
	result = _run_command(cmd, cwd=str(Path(__file__).resolve().parents[2]), env=env, timeout=3600)
	if result.returncode != 0:
		return {'status': 'fail', 'detail': f'scenarios failed (exit {result.returncode})'}
	return {'status': 'pass', 'detail': f'suite={suite} green'}


def main(argv=None) -> int:
	parser = argparse.ArgumentParser(prog='wht', description='watchmen test harness')
	sub = parser.add_subparsers(dest='command', required=True)
	run_parser = sub.add_parser('run', help='execute one full-stack e2e cycle')
	run_parser.add_argument('--db', default='mysql',
			help=f'comma-separated databases ({",".join(SUPPORTED_DBS)})')
	run_parser.add_argument('--suite', choices=['smoke', 'full'], default='full',
			help='smoke = fast core-path markers; full = every scenario')
	run_parser.add_argument('--skip-newman', action='store_true',
			help='skip the Postman collection phase')
	run_parser.add_argument('--keep', action='store_true',
			help='leave the docker stack running after the run (debug aid)')
	run_parser.add_argument('--results-dir', default=None,
			help='where reports are written (default ./test-results/<db>-<timestamp>)')
	args = parser.parse_args(argv)

	dbs = [db.strip() for db in args.db.split(',') if db.strip()]
	unsupported = [db for db in dbs if db not in SUPPORTED_DBS]
	if unsupported:
		parser.error(f'unsupported databases: {", ".join(unsupported)}')

	from datetime import datetime

	stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
	results_dir = Path(args.results_dir) if args.results_dir \
		else Path.cwd() / 'test-results' / f'{args.db}-{stamp}'

	settings = HarnessSettings()
	server = DollServerManager(settings, log_dir=results_dir)
	phases: Dict[str, Dict[str, str]] = {}

	def record(name: str, fn, *fn_args) -> None:
		try:
			detail = fn(*fn_args) if callable(fn) else fn
			phases[name] = {'status': 'pass', 'detail': detail or 'ok'}
			print(f'[wht] {name}: pass ({phases[name]["detail"]})')
		except Exception as e:
			phases[name] = {'status': 'fail', 'detail': str(e)}
			print(f'[wht] {name}: FAIL ({e})', file=sys.stderr)

	try:
		record('compose', _phase_compose, settings)
		record('db-scripts', _phase_db_scripts, settings)
		record('server', server.start)

		if phases.get('server', {}).get('status') == 'fail':
			phases['newman'] = {'status': 'skip', 'detail': 'server not available'}
			phases['scenarios'] = {'status': 'skip', 'detail': 'server not available'}
		else:
			phases['newman'] = _phase_newman(settings, results_dir, args.skip_newman)
			phases['scenarios'] = _phase_scenarios(settings, results_dir, args.suite)
	finally:
		if args.keep:
			print('[wht] --keep set: docker stack AND doll server left running for inspection.')
			print(f'      tear down with: docker compose -f {settings.compose_file} -p {COMPOSE_PROJECT} down -v')
			print(f'      stop server   : kill $(lsof -t -iTCP:{settings.server_port} -sTCP:LISTEN)')
		else:
			server.stop()
			_teardown_compose(settings)

	for name, outcome in phases.items():
		if outcome.get('status') == 'skip':
			print(f'[wht] {name}: skip ({outcome.get("detail")})')

	write_summary(results_dir, phases)
	failed = sum(1 for o in phases.values() if o.get('status') == 'fail')
	print(f'[wht] reports in {results_dir}')
	return failed


if __name__ == '__main__':
	sys.exit(main())
