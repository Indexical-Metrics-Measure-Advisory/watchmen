from __future__ import annotations

import argparse
import json
import math
import os
import platform
import re
import shutil
import subprocess
import sys
import time
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

from watchmen_test_harness.db_bootstrapper import DbBootstrapper
from watchmen_test_harness.evaluation_cli import register_evaluation_commands
from watchmen_test_harness.evaluation_models import MetricSample, RunManifest, SuiteResult
from watchmen_test_harness.evaluation_store import (
	load_policy,
	load_task,
	relative_artifact,
	sanitize,
	sha256_file,
	write_json,
)
from watchmen_test_harness.gate import evaluate_run
from watchmen_test_harness.report import write_summary
from watchmen_test_harness.server_manager import DollServerManager
from watchmen_test_harness.settings import HarnessSettings, package_root, repo_root


COMPOSE_PROJECT = 'wht'
SUPPORTED_DBS = ['mysql']
PERF_METRICS = {
	'extract_sec': 'seconds',
	'merge_sec': 'seconds',
	'first_target_sec': 'seconds',
	'e2e_sec': 'seconds',
	'throughput_rps': 'rows/second',
	'peak_queue_record': 'rows',
}


def _run_command(cmd: List[str], **kwargs) -> subprocess.CompletedProcess:
	print(f'+ {" ".join(cmd)}')
	return subprocess.run(cmd, **kwargs)


def _compose_cmd(settings: HarnessSettings, *args: str) -> List[str]:
	return [
		'docker', 'compose', '-f', str(settings.compose_file),
		'-p', COMPOSE_PROJECT, *args,
	]


def _phase_compose(settings: HarnessSettings) -> str:
	if shutil.which('docker') is None:
		raise RuntimeError('docker CLI not found on PATH; install Docker Desktop or engine')
	_run_command(_compose_cmd(settings, 'down', '-v'), check=False)
	result = _run_command(_compose_cmd(settings, 'up', '-d', '--wait'), timeout=300)
	if result.returncode != 0:
		raise RuntimeError(f'docker compose up failed (exit {result.returncode})')
	return 'database stack is ready'


def _teardown_compose(settings: HarnessSettings) -> None:
	if shutil.which('docker') is None:
		return
	result = _run_command(_compose_cmd(settings, 'down', '-v'), check=False)
	if result.returncode != 0:
		raise RuntimeError(f'docker compose down failed (exit {result.returncode})')


def _phase_db_scripts(settings: HarnessSettings) -> str:
	bootstrapper = DbBootstrapper(settings)
	bootstrapper.wait_until_ready()
	bootstrapper.apply_session_flags()
	applied = bootstrapper.apply_scripts()
	return f'{len(applied)} script(s) applied'


def _phase_newman(settings: HarnessSettings, results_dir: Path, skip_newman: bool) -> SuiteResult:
	if skip_newman:
		return SuiteResult(
			name='newman', status='skip', required=False, explicit_skip=True,
			detail='requested via --skip-newman',
		)
	if shutil.which('newman') is None:
		return SuiteResult(
			name='newman', status='skip', required=False,
			detail='newman not found on PATH (node not installed?)',
		)
	postman_dir = repo_root() / 'packages' / 'watchmen-test-postman'
	env_file = _derived_postman_env(settings, postman_dir / 'mysql.json', results_dir)
	collection_file = _derived_postman_collection(settings, postman_dir / 'watchmen-postman.json', results_dir)
	report_file = results_dir / 'postman-report.html'
	result = _run_command(
		[
			'newman', 'run', str(collection_file),
			'-e', str(env_file),
			'--bail', '-r', 'cli,htmlextra',
			'--reporter-htmlextra-export', str(report_file),
			'--delay-request', '200',
		],
		cwd=str(repo_root()), timeout=3600,
	)
	artifacts = [
		relative_artifact(results_dir, path)
		for path in (env_file, collection_file, report_file) if path.is_file()
	]
	return SuiteResult(
		name='newman',
		status='fail' if result.returncode != 0 else 'pass',
		required=False,
		detail=f'postman collection failed (exit {result.returncode})' if result.returncode != 0
		else 'collection green',
		artifacts=artifacts,
	)


def _derived_postman_env(settings: HarnessSettings, source: Path, results_dir: Path) -> Path:
	data = json.loads(source.read_text(encoding='utf-8'))
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
		if 'http://localhost:8000' in value:
			value = value.replace('http://localhost:8000', settings.base_url)
		if '@127.0.0.1:3306/' in value:
			value = value.replace('@127.0.0.1:3306/', f'@{settings.mysql_host}:{settings.mysql_port}/')
		item['value'] = value
	target = results_dir / f'{source.stem}-derived.json'
	results_dir.mkdir(parents=True, exist_ok=True)
	target.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
	return target


def _derived_postman_collection(settings: HarnessSettings, source: Path, results_dir: Path) -> Path:
	def rewrite(node):
		if isinstance(node, dict):
			return {key: rewrite(value) for key, value in node.items()}
		if isinstance(node, list):
			return [rewrite(value) for value in node]
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


def _junit_counts(path: Path) -> Dict[str, int]:
	if not path.is_file():
		return {}
	root = ET.parse(path).getroot()
	suites = [root] if root.tag == 'testsuite' else list(root.iter('testsuite'))
	return {
		'total': sum(int(suite.attrib.get('tests', 0)) for suite in suites),
		'passed': sum(
			int(suite.attrib.get('tests', 0))
			- int(suite.attrib.get('failures', 0))
			- int(suite.attrib.get('errors', 0))
			- int(suite.attrib.get('skipped', 0)) for suite in suites
		),
		'failed': sum(
			int(suite.attrib.get('failures', 0)) + int(suite.attrib.get('errors', 0))
			for suite in suites
		),
		'skipped': sum(int(suite.attrib.get('skipped', 0)) for suite in suites),
	}


def _phase_scenarios(settings: HarnessSettings, results_dir: Path, suite: str) -> SuiteResult:
	junit = results_dir / 'junit-scenarios.xml'
	cmd = [
		sys.executable, '-m', 'pytest', 'scenarios',
		'-q', f'--junitxml={junit}',
	]
	if suite == 'smoke':
		cmd += ['-m', 'smoke']
	elif suite == 'perf':
		cmd += ['-m', 'perf']
	env = dict(os.environ)
	server_env = settings.server_env()
	perf_config = {
		key: value for key, value in server_env.items()
		if key.startswith('PIPELINE_') or key in {
			'USE_STORAGE_DIRECTLY', 'COLLECTOR_ON', 'QUERY_BASED_CHANGE_DATA_CAPTURE', 'TASK_LISTENER_ON',
		}
	}
	env.update({
		'WHT_BASE_URL': settings.base_url,
		'WHT_ADMIN_USER': settings.admin_user,
		'WHT_ADMIN_PASSWORD': settings.admin_password,
		'WHT_PERF_OUT': str(results_dir / 'performance.json'),
		'WHT_PERF_CONFIG': json.dumps(perf_config),
	})
	if suite == 'perf':
		env['WHT_PERF'] = '1'
	result = _run_command(cmd, cwd=str(package_root()), env=env, timeout=3600)
	counts = _junit_counts(junit)
	return SuiteResult(
		name='scenarios',
		status='fail' if result.returncode != 0 else 'pass',
		detail=f'scenarios failed (exit {result.returncode})' if result.returncode != 0
		else f'suite={suite} green',
		artifacts=[relative_artifact(results_dir, junit)] if junit.is_file() else [],
		**counts,
	)


def _performance_result(results_dir: Path, requested: bool) -> tuple[SuiteResult, List[MetricSample]]:
	path = results_dir / 'performance.json'
	if not path.is_file():
		return SuiteResult(
			name='performance', status='fail' if requested else 'skip', required=False,
			explicit_skip=not requested,
			detail='requested but performance.json is missing' if requested
			else 'opt-in performance scenario was not requested',
		), []
	data = json.loads(path.read_text(encoding='utf-8'))
	metrics = [
		MetricSample(name=name, value=float(data[name]), unit=unit, source='performance.json')
		for name, unit in PERF_METRICS.items()
		if isinstance(data.get(name), (int, float)) and math.isfinite(float(data[name]))
	]
	return SuiteResult(
		name='performance', status='pass', required=False,
		detail=f'{len(metrics)} metric samples collected',
		artifacts=[relative_artifact(results_dir, path)],
	), metrics


def _git(*args: str) -> Optional[str]:
	result = subprocess.run(
		['git', *args], cwd=str(repo_root()), capture_output=True, text=True, check=False,
	)
	return result.stdout.strip() if result.returncode == 0 else None


def _revision_state(base_revision: Optional[str]) -> Dict[str, object]:
	head = _git('rev-parse', 'HEAD')
	base = base_revision or _git('merge-base', 'HEAD', 'origin/main') or head
	status = _git('status', '--porcelain')
	changed_output = _git('diff', '--name-only', base) if base else ''
	untracked_output = _git('ls-files', '--others', '--exclude-standard') or ''
	changed = sorted(set((changed_output or '').splitlines()) | set(untracked_output.splitlines()))
	return {
		'base_revision': base,
		'head_revision': head,
		'dirty': bool(status) if status is not None else None,
		'changed_files': changed,
	}


def _build_run_parser(subparsers) -> None:
	run_parser = subparsers.add_parser('run', help='execute one full-stack e2e evaluation cycle')
	run_parser.add_argument('--db', default='mysql', help=f'database ({",".join(SUPPORTED_DBS)})')
	run_parser.add_argument('--suite', choices=['smoke', 'full', 'perf'], default='full')
	run_parser.add_argument('--skip-newman', action='store_true')
	run_parser.add_argument('--keep', action='store_true', help='leave the stack running for debugging')
	run_parser.add_argument('--results-dir', default=None)
	run_parser.add_argument('--strict', action='store_true', help='forbid implicit skips')
	run_parser.add_argument('--task', default=None, help='task id or task JSON path')
	run_parser.add_argument('--policy', default='default', help='policy id or policy JSON path')
	run_parser.add_argument('--run-id', default=None)
	run_parser.add_argument('--label', choices=['baseline', 'candidate', 'other'], default='other')
	run_parser.add_argument('--attempt', type=int, default=0)
	run_parser.add_argument('--base-revision', default=None)


def _run(args: argparse.Namespace, raw_argv: List[str]) -> int:
	dbs = [db.strip() for db in args.db.split(',') if db.strip()]
	if len(dbs) != 1 or dbs[0] not in SUPPORTED_DBS:
		raise ValueError(f'exactly one supported database is required: {", ".join(SUPPORTED_DBS)}')
	stamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')
	run_id = args.run_id or f'{dbs[0]}-{stamp}-{uuid.uuid4().hex[:8]}'
	if not re.fullmatch(r'[A-Za-z0-9._-]+', run_id):
		raise ValueError('run id may contain only letters, digits, dot, underscore and dash')
	results_dir = Path(args.results_dir) if args.results_dir else Path.cwd() / 'test-results' / run_id
	results_dir.mkdir(parents=True, exist_ok=True)

	task = task_path = None
	if args.task:
		task, task_path = load_task(args.task)
		write_json(results_dir / 'task.json', task)
	policy, policy_path = load_policy(args.policy)
	write_json(results_dir / 'policy.json', policy)

	settings = HarnessSettings()
	server = DollServerManager(settings, log_dir=results_dir)
	phases: Dict[str, SuiteResult] = {}
	metrics: List[MetricSample] = []
	started_at = datetime.now(timezone.utc)

	def record(name: str, fn, *fn_args, required: bool = True) -> None:
		started = time.perf_counter()
		try:
			result = fn(*fn_args)
			if not isinstance(result, SuiteResult):
				result = SuiteResult(name=name, status='pass', required=required, detail=result or 'ok')
			print(f'[wht] {name}: {result.status} ({result.detail})')
		except Exception as error:
			result = SuiteResult(name=name, status='error', required=required, detail=str(error))
			print(f'[wht] {name}: ERROR ({error})', file=sys.stderr)
		result.duration_ms = round((time.perf_counter() - started) * 1000)
		phases[name] = result

	def skip(name: str, detail: str, required: bool) -> None:
		phases[name] = SuiteResult(name=name, status='skip', required=required, detail=detail)

	try:
		record('compose', _phase_compose, settings)
		if phases['compose'].status == 'pass':
			record('db-scripts', _phase_db_scripts, settings)
		else:
			skip('db-scripts', 'database stack is not available', True)
		if phases['db-scripts'].status == 'pass':
			record('server', server.start)
		else:
			skip('server', 'database initialization did not complete', True)

		if phases['server'].status != 'pass':
			skip('newman', 'server not available', False)
			skip('scenarios', 'server not available', True)
			skip('performance', 'server not available', False)
		else:
			record('newman', _phase_newman, settings, results_dir, args.skip_newman, required=False)
			record('scenarios', _phase_scenarios, settings, results_dir, args.suite)
			perf_requested = args.suite == 'perf' or os.environ.get('WHT_PERF') == '1'
			performance, performance_metrics = _performance_result(results_dir, perf_requested)
			phases['performance'] = performance
			metrics.extend(performance_metrics)
	finally:
		if args.keep:
			print('[wht] --keep set: docker stack AND doll server left running for inspection.')
		else:
			def teardown() -> str:
				try:
					server.stop()
				finally:
					_teardown_compose(settings)
				return 'server and database stack stopped'
			record('teardown', teardown, required=False)

	artifacts: Dict[str, str] = {'summary': 'summary.md'}
	for suite in phases.values():
		for index, artifact in enumerate(suite.artifacts):
			artifacts[f'{suite.name}-{index}'] = artifact
	server_log = results_dir / 'doll-server.log'
	if server_log.is_file():
		artifacts['server-log'] = 'doll-server.log'
	write_summary(results_dir, phases)
	config = sanitize(settings.model_dump(mode='json'))
	config.update({'strict': args.strict, 'suite': args.suite, 'database': dbs[0]})
	manifest = RunManifest(
		run_id=run_id,
		task_id=task.id if task else None,
		task_version=task.version if task else None,
		label=args.label,
		attempt=args.attempt,
		started_at=started_at,
		finished_at=datetime.now(timezone.utc),
		command=['wht', *raw_argv],
		environment={'python': platform.python_version(), 'platform': platform.platform()},
		config=config,
		task_hash=sha256_file(task_path) if task_path else None,
		policy_hash=sha256_file(policy_path),
		suites=list(phases.values()),
		metrics=metrics,
		artifacts=artifacts,
		**_revision_state(args.base_revision),
	)
	write_json(results_dir / 'run.json', manifest)
	gate = evaluate_run(
		manifest, results_dir, policy, task=task, check_protected=args.label == 'candidate',
	)
	write_json(results_dir / 'gate.json', gate)
	manifest.artifacts['gate'] = 'gate.json'
	write_json(results_dir / 'run.json', manifest)
	write_summary(results_dir, phases, gate)
	failed = sum(1 for outcome in phases.values() if outcome.status in {'fail', 'error'})
	print(f'[wht] reports in {results_dir}')
	return failed + (1 if gate.status == 'fail' else 0)


def main(argv=None) -> int:
	raw_argv = list(argv) if argv is not None else sys.argv[1:]
	parser = argparse.ArgumentParser(prog='wht', description='watchmen test and evaluation harness')
	subparsers = parser.add_subparsers(dest='command', required=True)
	_build_run_parser(subparsers)
	register_evaluation_commands(subparsers)
	args = parser.parse_args(raw_argv)
	try:
		if hasattr(args, 'handler'):
			return args.handler(args)
		return _run(args, raw_argv)
	except (ValueError, FileNotFoundError, json.JSONDecodeError) as error:
		print(f'[wht] ERROR: {error}', file=sys.stderr)
		return 2


if __name__ == '__main__':
	sys.exit(main())
