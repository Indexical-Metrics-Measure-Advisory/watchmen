from __future__ import annotations

import argparse
import json
import os
import sys
import traceback
from typing import Any, Callable, Dict, List, Optional

from operation_cli.exceptions import OperationCliException
from operation_cli.http_client import RestClient
from operation_cli.operation_service import OperationService
from operation_cli.settings import settings
from operation_cli.vault import ensure_vault, load_config, save_config

DISCOVER_COMMANDS = {
	'init': ['--vault', '--host', '--username', '--password', '--pat', '--tenant-id'],
	'config': ['--vault'],
	'discover': [],
	'pipeline errors': [
		'--page-number', '--page-size', '--topic-id', '--pipeline-id',
		'--start-date', '--end-date', '--trace-id', '--tenant-id', '--vault',
	],
	'pipeline stats': [
		'--topic-id', '--pipeline-id', '--start-date', '--end-date',
		'--sample-size', '--tenant-id', '--vault',
	],
	'ingest events': ['--page-number', '--page-size', '--tenant-id', '--vault'],
	'ingest failed': ['--page-number', '--page-size', '--tenant-id', '--vault'],
	'ingest detail': ['trigger_event_id', '--tenant-id', '--vault'],
	'ingest stats': ['--sample-size', '--tenant-id', '--vault'],
	'ingest trigger-online': ['--tenant-id', '--vault'],
}


def run() -> None:
	parser = build_parser()
	args: Optional[argparse.Namespace] = None
	try:
		args = parser.parse_args()
		args.handler(args)
	except KeyboardInterrupt:
		output_error('Interrupted by user')
		raise SystemExit(130)
	except OperationCliException as e:
		output_error(f'{e.__class__.__name__}: {e}')
		if should_show_traceback(args):
			traceback.print_exc(file=sys.stderr)
		raise SystemExit(getattr(e, 'exit_code', 1))
	except Exception as e:
		output_error(f'UnexpectedError: {e}')
		if should_show_traceback(args):
			traceback.print_exc(file=sys.stderr)
		raise SystemExit(10)


def build_parser() -> argparse.ArgumentParser:
	parser = argparse.ArgumentParser(prog='operation-cli', description='Watchmen operation CLI for latest pipeline and ingest error data')
	parser.add_argument('--debug', action='store_true', help='Print exception traceback for debugging')
	add_help_alias(parser)
	subparsers = parser.add_subparsers(dest='command', required=True)
	register_init_command(subparsers)
	register_config_command(subparsers)
	register_discover_command(subparsers)
	register_pipeline_commands(subparsers)
	register_ingest_commands(subparsers)
	return parser


def handle_init(args: argparse.Namespace) -> None:
	vault_path = settings.resolved_vault(args.vault)
	host = args.host or settings.host
	if host and not host.startswith('http://') and not host.startswith('https://'):
		host = f'http://{host}'
	config = {
		'host': host,
		'username': args.username or settings.username,
		'password': args.password or settings.password,
		'pat': args.pat or settings.pat,
		'tenant_id': args.tenant_id or settings.tenant_id,
	}
	if not vault_path.exists():
		vault_path.mkdir(parents=True, exist_ok=True)
	ensure_vault(vault_path)
	save_config(vault_path, config)
	print(f'Initialized vault: {vault_path}')


def handle_config(args: argparse.Namespace) -> None:
	vault_path = settings.resolved_vault(args.vault)
	cfg = load_config(vault_path)
	output_json({'vault': str(vault_path), **mask_config(cfg)})


def handle_discover(args: argparse.Namespace) -> None:
	output_json({'name': 'operation-cli', 'commands': DISCOVER_COMMANDS})


def handle_pipeline_errors(args: argparse.Namespace) -> None:
	run_with_service(args, lambda svc: svc.pipeline_errors(
		page_number=args.page_number,
		page_size=args.page_size,
		topic_id=args.topic_id,
		pipeline_id=args.pipeline_id,
		start_date=args.start_date,
		end_date=args.end_date,
		trace_id=args.trace_id,
	))


def handle_pipeline_stats(args: argparse.Namespace) -> None:
	run_with_service(args, lambda svc: svc.pipeline_stats(
		topic_id=args.topic_id,
		pipeline_id=args.pipeline_id,
		start_date=args.start_date,
		end_date=args.end_date,
		sample_size=args.sample_size,
	))


def handle_ingest_events(args: argparse.Namespace) -> None:
	run_with_service(args, lambda svc: svc.ingest_events(
		page_number=args.page_number,
		page_size=args.page_size,
	))


def handle_ingest_failed(args: argparse.Namespace) -> None:
	run_with_service(args, lambda svc: svc.ingest_failed_events(
		page_number=args.page_number,
		page_size=args.page_size,
	))


def handle_ingest_detail(args: argparse.Namespace) -> None:
	run_with_service(args, lambda svc: svc.ingest_event_detail(args.trigger_event_id))


def handle_ingest_stats(args: argparse.Namespace) -> None:
	run_with_service(args, lambda svc: svc.ingest_event_stats(sample_size=args.sample_size))


def handle_ingest_trigger_online(args: argparse.Namespace) -> None:
	run_with_service(args, lambda svc: svc.ingest_trigger_online())


def build_operation_service(args: argparse.Namespace) -> OperationService:
	vault_path = settings.resolved_vault(getattr(args, 'vault', None))
	cfg = load_config(vault_path)
	tenant_id = cfg.get('tenant_id') or settings.tenant_id
	client = RestClient(
		host=cfg.get('host') or settings.host,
		pat=cfg.get('pat'),
		username=cfg.get('username'),
		password=cfg.get('password'),
	)
	return OperationService(client=client, tenant_id=tenant_id)


def run_with_service(args: argparse.Namespace, action: Callable[[OperationService], Any]) -> None:
	output_json(action(build_operation_service(args)))


def mask_config(cfg: Dict[str, Any]) -> Dict[str, Any]:
	masked = dict(cfg)
	if masked.get('password'):
		masked['password'] = '***'
	if masked.get('pat'):
		masked['pat'] = '***'
	return masked


def output_json(payload: Any) -> None:
	print(json.dumps(payload, ensure_ascii=False, indent=2))


def output_error(message: str) -> None:
	print(message, file=sys.stderr)


def should_show_traceback(args: Optional[argparse.Namespace]) -> bool:
	if args is not None and bool(getattr(args, 'debug', False)):
		return True
	return os.getenv('OPERATION_CLI_DEBUG', '').strip() in {'1', 'true', 'TRUE', 'yes', 'YES'}


def add_help_alias(parser: argparse.ArgumentParser) -> None:
	parser.add_argument('-help', action='help', help='show this help message and exit')


def add_vault_arg(parser: argparse.ArgumentParser) -> None:
	parser.add_argument('--vault', required=False)


def add_tenant_arg(parser: argparse.ArgumentParser) -> None:
	# Required for super-admin principals; ignored for tenant admins (server forces their tenant).
	parser.add_argument('--tenant-id', required=False, help='Tenant id (required for super-admin)')


def add_paging_args(parser: argparse.ArgumentParser, default_size: int = 50) -> None:
	parser.add_argument('--page-number', required=False, type=int, default=1)
	parser.add_argument('--page-size', required=False, type=int, default=default_size)


def create_subparser(subparsers: argparse._SubParsersAction, name: str, help_text: str) -> argparse.ArgumentParser:
	parser = subparsers.add_parser(name, help=help_text)
	add_help_alias(parser)
	return parser


def register_init_command(subparsers: argparse._SubParsersAction) -> None:
	init_parser = create_subparser(subparsers, 'init', 'Initialize local vault and connection configuration')
	init_parser.add_argument('--vault', required=False)
	init_parser.add_argument('--host', required=False)
	init_parser.add_argument('--username', required=False)
	init_parser.add_argument('--password', required=False)
	init_parser.add_argument('--pat', required=False)
	init_parser.add_argument('--tenant-id', required=False)
	init_parser.set_defaults(handler=handle_init)


def register_config_command(subparsers: argparse._SubParsersAction) -> None:
	config_parser = create_subparser(subparsers, 'config', 'Show current configuration')
	add_vault_arg(config_parser)
	config_parser.set_defaults(handler=handle_config)


def register_discover_command(subparsers: argparse._SubParsersAction) -> None:
	discover_parser = create_subparser(subparsers, 'discover', 'Output a list of discoverable commands')
	discover_parser.set_defaults(handler=handle_discover)


def register_pipeline_commands(subparsers: argparse._SubParsersAction) -> None:
	pipeline_parser = create_subparser(subparsers, 'pipeline', 'Pipeline monitor error commands')
	pipeline_sub = pipeline_parser.add_subparsers(dest='pipeline_cmd', required=True)

	errors = create_subparser(pipeline_sub, 'errors', 'Fetch latest pipeline runtime error logs (POST /pipeline/log, status=ERROR)')
	add_paging_args(errors, default_size=50)
	errors.add_argument('--topic-id', required=False)
	errors.add_argument('--pipeline-id', required=False)
	errors.add_argument('--start-date', required=False, help='ISO datetime')
	errors.add_argument('--end-date', required=False, help='ISO datetime')
	errors.add_argument('--trace-id', required=False)
	add_tenant_arg(errors)
	add_vault_arg(errors)
	errors.set_defaults(handler=handle_pipeline_errors)

	stats = create_subparser(pipeline_sub, 'stats', 'Fetch pipeline monitor log statistics (POST /pipeline/log/stats)')
	stats.add_argument('--topic-id', required=False)
	stats.add_argument('--pipeline-id', required=False)
	stats.add_argument('--start-date', required=False, help='ISO datetime')
	stats.add_argument('--end-date', required=False, help='ISO datetime')
	stats.add_argument('--sample-size', required=False, type=int)
	add_tenant_arg(stats)
	add_vault_arg(stats)
	stats.set_defaults(handler=handle_pipeline_stats)


def register_ingest_commands(subparsers: argparse._SubParsersAction) -> None:
	ingest_parser = create_subparser(subparsers, 'ingest', 'Ingest / collector error commands')
	ingest_sub = ingest_parser.add_subparsers(dest='ingest_cmd', required=True)

	events = create_subparser(ingest_sub, 'events', 'Fetch latest trigger events (POST /ingest/monitor/event)')
	add_paging_args(events, default_size=50)
	add_tenant_arg(events)
	add_vault_arg(events)
	events.set_defaults(handler=handle_ingest_events)

	failed = create_subparser(ingest_sub, 'failed', 'Fetch failed trigger events only (status=FAIL, client-side filter)')
	add_paging_args(failed, default_size=50)
	add_tenant_arg(failed)
	add_vault_arg(failed)
	failed.set_defaults(handler=handle_ingest_failed)

	detail = create_subparser(ingest_sub, 'detail', 'Fetch per-table detail for one trigger event (GET /ingest/monitor/event/detail)')
	detail.add_argument('trigger_event_id', type=int)
	add_tenant_arg(detail)
	add_vault_arg(detail)
	detail.set_defaults(handler=handle_ingest_detail)

	ingest_stats = create_subparser(ingest_sub, 'stats', 'Fetch trigger event statistics (POST /ingest/monitor/event/stats)')
	ingest_stats.add_argument('--sample-size', required=False, type=int)
	add_tenant_arg(ingest_stats)
	add_vault_arg(ingest_stats)
	ingest_stats.set_defaults(handler=handle_ingest_stats)

	online = create_subparser(ingest_sub, 'trigger-online', 'Fetch the latest 10 online triggers (GET /ingest/monitor/trigger-online)')
	add_tenant_arg(online)
	add_vault_arg(online)
	online.set_defaults(handler=handle_ingest_trigger_online)


if __name__ == '__main__':
	run()
