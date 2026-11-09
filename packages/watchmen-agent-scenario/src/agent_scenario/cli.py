import argparse
import json
import sys
from typing import Optional

from agent_scenario import __version__
from agent_scenario.http_client import ApiClient, HttpError
from agent_scenario.report import Report, truncate
from agent_scenario.settings import Settings

PAT_NOTE = 'watchmen-agent-scenario'


class ScenarioError(Exception):
	"""Fatal scenario configuration or execution error."""


def resolve_pat(settings: Settings) -> str:
	"""Return a PAT for both CLI vaults.

	The standalone metricflow service has no /login route, so the runtime vault
	always needs a PAT. When only username/password is provided, a dedicated PAT
	is created once via the doll and reused for the whole scenario run.
	"""
	if settings.admin_pat:
		return settings.admin_pat
	if not (settings.admin_user and settings.admin_password):
		raise ScenarioError(
			'Provide SCN_ADMIN_PAT, or SCN_ADMIN_USER + SCN_ADMIN_PASSWORD '
			'(a PAT will be created automatically)')
	client = ApiClient(
		settings.doll_host,
		username=settings.admin_user, password=settings.admin_password)
	created = client.post('/pat/create', {'note': PAT_NOTE, 'expired': None})
	token = str(created.get('token') or '').strip()
	if not token:
		raise ScenarioError(f'/pat/create returned no token: {truncate(created)}')
	return token


def build_clients(settings: Settings, pat: str):
	"""Admin + metricflow clients; no super-admin involved."""
	admin_client = ApiClient(settings.doll_host, pat=pat)
	metricflow_client = ApiClient(settings.metricflow_host, pat=pat)
	return admin_client, metricflow_client


def build_super_client(settings: Settings) -> ApiClient:
	"""Super-admin client, PAT-only (datasource create/delete step)."""
	if not settings.super_pat:
		raise ScenarioError(
			'This step needs a super-admin PAT: set SCN_SUPER_PAT '
			'(or SCN_ADMIN_PAT when it belongs to a super-admin account). '
			'Username/password is not accepted for the super-admin step.')
	return ApiClient(settings.doll_host, pat=settings.super_pat)


def find_scenario_datasource_id(settings: Settings, admin_client: ApiClient) -> str:
	from agent_scenario.bootstrap import find_datasource_by_code
	existing = find_datasource_by_code(admin_client, settings.datasource_code)
	if existing is None:
		raise ScenarioError(
			f'Datasource [{settings.datasource_code}] not found; run bootstrap first')
	return existing['dataSourceId']


def write_report(report: Report, settings: Settings) -> None:
	report_file = settings.workdir / 'scenario-report.json'
	report.write(report_file)
	report.print_summary()
	print(f'Report written to {report_file}')


def cmd_bootstrap(args, settings: Settings, report: Report, pat: str) -> int:
	from agent_scenario.bootstrap import run_bootstrap
	admin_client, _ = build_clients(settings, pat)
	super_client = build_super_client(settings)
	run_bootstrap(settings, report, admin_client, super_client)
	return 0


def cmd_push(args, settings: Settings, report: Report, pat: str) -> int:
	from agent_scenario.pusher import Pusher
	admin_client, _, _ = build_clients(settings, pat)
	Pusher(settings, report, pat, admin_client=admin_client).push_all()
	return 0


def cmd_inject(args, settings: Settings, report: Report, pat: str) -> int:
	from agent_scenario.injector import inject_mock_data
	admin_client, _ = build_clients(settings, pat)
	inject_mock_data(settings, report, admin_client)
	return 0


def cmd_bind(args, settings: Settings, report: Report, pat: str) -> int:
	from agent_scenario.binder import bind_ontology_datasource
	admin_client, metricflow_client = build_clients(settings, pat)
	data_source_id = find_scenario_datasource_id(settings, admin_client)
	bind_ontology_datasource(settings, report, metricflow_client, data_source_id)
	return 0


def cmd_verify(args, settings: Settings, report: Report, pat: str) -> int:
	from agent_scenario.pusher import Pusher
	from agent_scenario.verifier import Verifier
	pusher = Pusher(settings, report, pat)
	Verifier(settings, report, pusher.runtime_cli).verify_all()
	return 0


def cmd_merge_check(args, settings: Settings, report: Report, pat: str) -> int:
	from agent_scenario.merge_check import run_merge_check
	from agent_scenario.pusher import Pusher
	admin_client, _ = build_clients(settings, pat)
	pusher = Pusher(settings, report, pat)
	run_merge_check(settings, report, admin_client, pusher.runtime_cli)
	return 0


def cmd_teardown(args, settings: Settings, report: Report, pat: str) -> int:
	from agent_scenario.teardown import run_teardown
	admin_client, metricflow_client = build_clients(settings, pat)
	super_client = build_super_client(settings)
	run_teardown(settings, report, admin_client, super_client, metricflow_client,
		drop_database=args.drop_db)
	return 0


def cmd_bind_infra(args, settings: Settings, report: Report, pat: str) -> int:
	from agent_scenario.bootstrap import bind_infra_topics
	admin_client, _ = build_clients(settings, pat)
	data_source_id = find_scenario_datasource_id(settings, admin_client)
	bind_infra_topics(settings, report, admin_client, data_source_id)
	return 0


def cmd_run(args, settings: Settings, report: Report, pat: str) -> int:
	from agent_scenario.binder import bind_ontology_datasource
	from agent_scenario.bootstrap import bind_infra_topics, run_bootstrap
	from agent_scenario.injector import inject_mock_data
	from agent_scenario.merge_check import run_merge_check
	from agent_scenario.pusher import Pusher
	from agent_scenario.verifier import Verifier

	admin_client, metricflow_client = build_clients(settings, pat)

	data_source_id: Optional[str] = None
	if not args.skip_bootstrap:
		super_client = build_super_client(settings)
		data_source = run_bootstrap(settings, report, admin_client, super_client)
		data_source_id = data_source['dataSourceId']
	else:
		report.record('bootstrap.skipped', True, '--skip-bootstrap')
		data_source_id = find_scenario_datasource_id(settings, admin_client)
		# fresh tenants carry infra monitor topics without a datasource, which
		# makes every pipeline trigger log an async write error; bind them here
		# (idempotent) so --skip-bootstrap runs are self-sufficient too
		bind_infra_topics(settings, report, admin_client, data_source_id)

	pusher = Pusher(settings, report, pat, admin_client=admin_client)
	pusher.push_all()

	if data_source_id is None:
		data_source_id = find_scenario_datasource_id(settings, admin_client)
	bind_ontology_datasource(settings, report, metricflow_client, data_source_id)
	inject_mock_data(settings, report, admin_client)
	Verifier(settings, report, pusher.runtime_cli).verify_all()
	# insert-or-merge UPDATE propagation: change one premium, assert everything
	# shifts, restore, assert it falls back (data ends identical to the mock)
	run_merge_check(settings, report, admin_client, pusher.runtime_cli)
	return 0


def cmd_config(args, settings: Settings, report: Report, pat: str) -> int:
	print(json.dumps(settings.masked_summary(), indent=2))
	return 0


COMMANDS = {
	'bootstrap': cmd_bootstrap,
	'push': cmd_push,
	'inject': cmd_inject,
	'bind': cmd_bind,
	'bind-infra': cmd_bind_infra,
	'verify': cmd_verify,
	'merge-check': cmd_merge_check,
	'teardown': cmd_teardown,
	'run': cmd_run,
	'config': cmd_config,
}


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(
		prog='agent-scenario',
		description='Sync the scenario YAML via agent-cli into an (empty) environment '
			'and verify it end-to-end via agent-runtime-cli.')
	parser.add_argument('--version', action='version', version=f'agent-scenario {__version__}')
	subparsers = parser.add_subparsers(dest='command', required=True)

	subparsers.add_parser('bootstrap', help='create scenario database, datasource, bind infra topics')
	subparsers.add_parser('push', help='push topics/pipelines/semantic/metrics/ontology via agent-cli')
	subparsers.add_parser('inject', help='inject mock policy records via POST /pipeline/data')
	subparsers.add_parser('bind', help='bind ontology virtual objects to the scenario datasource')
	subparsers.add_parser(
		'bind-infra',
		help='bind tenant infra monitor topics (raw_pipeline_monitor_log, pipeline_monitor_error_log) '
			'to the scenario datasource; required once per fresh tenant')
	subparsers.add_parser('verify', help='assert runtime results via agent-runtime-cli')
	subparsers.add_parser(
		'merge-check',
		help='inject one changed record, assert every aggregate shifts (insert-or-merge UPDATE '
			'propagation), then restore the original value and assert it falls back')

	teardown_parser = subparsers.add_parser('teardown', help='best-effort removal of scenario entities')
	teardown_parser.add_argument(
		'--drop-db', action='store_true',
		help=f'also DROP the scenario MySQL database (default: keep)')

	run_parser = subparsers.add_parser(
		'run', help='bootstrap -> push -> bind -> inject -> verify in one shot')
	run_parser.add_argument(
		'--skip-bootstrap', action='store_true',
		help='skip database/datasource creation (environment already prepared)')

	subparsers.add_parser('config', help='print resolved settings (secrets masked)')
	return parser


def main() -> None:
	parser = build_parser()
	args = parser.parse_args()
	settings = Settings()
	report = Report()
	exit_code = 1
	try:
		if args.command != 'config':
			settings.workdir.mkdir(parents=True, exist_ok=True)
		pat = resolve_pat(settings)
		exit_code = COMMANDS[args.command](args, settings, report, pat)
	except (ScenarioError, HttpError) as e:
		report.record(args.command, False, truncate(e))
	except Exception as e:  # noqa: BLE001 - report any unexpected failure instead of a traceback
		report.record(args.command, False, f'{e.__class__.__name__}: {e}')
	if report.steps:
		write_report(report, settings)
	sys.exit(exit_code if not report.failures else 1)


def run() -> None:
	main()


if __name__ == '__main__':
	run()
