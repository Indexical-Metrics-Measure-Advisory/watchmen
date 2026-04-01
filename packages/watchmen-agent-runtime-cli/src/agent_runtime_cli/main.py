from __future__ import annotations

import argparse
import json
import os
import sys
import traceback
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from agent_runtime_cli.exceptions import AgentRuntimeCliException
from agent_runtime_cli.http_client import RestClient
from agent_runtime_cli.runtime_service import RuntimeService
from agent_runtime_cli.settings import settings
from agent_runtime_cli.vault import ensure_vault, load_config, save_config

DISCOVER_COMMANDS = {
    "init": ["--vault", "--host", "--username", "--password", "--pat"],
    "config": ["--vault"],
    "discover": [],
    "health": ["--vault"],
    "date": ["--vault"],
    "metrics list": ["--vault"],
    "metrics dimensions": ["metric_name", "--vault"],
    "metrics find-dimensions": ["--metrics", "--vault"],
    "metrics value": [
        "metric_name",
        "--group-by",
        "--where",
        "--start-time",
        "--end-time",
        "--order",
        "--limit",
        "--time-granularity",
        "--vault",
    ],
    "metrics query-file": ["file_path", "--vault"],
}


def run() -> None:
    parser = build_parser()
    args: Optional[argparse.Namespace] = None
    try:
        args = parser.parse_args()
        args.handler(args)
    except KeyboardInterrupt:
        output_error("Interrupted by user")
        raise SystemExit(130)
    except AgentRuntimeCliException as e:
        output_error(f"{e.__class__.__name__}: {e}")
        if should_show_traceback(args):
            traceback.print_exc(file=sys.stderr)
        raise SystemExit(getattr(e, "exit_code", 1))
    except Exception as e:
        output_error(f"UnexpectedError: {e}")
        if should_show_traceback(args):
            traceback.print_exc(file=sys.stderr)
        raise SystemExit(10)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="agent-runtime-cli", description="Watchmen runtime metric query CLI")
    parser.add_argument("--debug", action="store_true", help="Print exception traceback for debugging")
    add_help_alias(parser)
    subparsers = parser.add_subparsers(dest="command", required=True)
    register_init_command(subparsers)
    register_config_command(subparsers)
    register_discover_command(subparsers)
    register_runtime_commands(subparsers)
    register_metrics_commands(subparsers)
    return parser


def handle_init(args: argparse.Namespace) -> None:
    vault_path = settings.resolved_vault(args.vault)
    host = args.host or settings.host
    if host and not host.startswith("http://") and not host.startswith("https://"):
        host = f"http://{host}"
    config = {
        "host": host,
        "username": args.username or settings.username,
        "password": args.password or settings.password,
        "pat": args.pat or settings.pat,
    }
    if not vault_path.exists():
        vault_path.mkdir(parents=True, exist_ok=True)
    ensure_vault(vault_path)
    save_config(vault_path, config)
    print(f"Initialized vault: {vault_path}")


def handle_config(args: argparse.Namespace) -> None:
    vault_path = settings.resolved_vault(args.vault)
    cfg = load_config(vault_path)
    output_json({"vault": str(vault_path), **mask_config(cfg)})


def handle_discover(args: argparse.Namespace) -> None:
    output_json({"name": "agent-runtime-cli", "commands": DISCOVER_COMMANDS})


def handle_health(args: argparse.Namespace) -> None:
    run_with_runtime_service(args, lambda svc: svc.health())


def handle_current_date(args: argparse.Namespace) -> None:
    run_with_runtime_service(args, lambda svc: {"current_date": svc.current_date()})


def handle_metrics_list(args: argparse.Namespace) -> None:
    run_with_runtime_service(args, lambda svc: svc.list_metrics())


def handle_metrics_dimensions(args: argparse.Namespace) -> None:
    run_with_runtime_service(args, lambda svc: svc.dimensions_by_metric(args.metric_name))


def handle_metrics_find_dimensions(args: argparse.Namespace) -> None:
    run_with_runtime_service(args, lambda svc: svc.find_dimensions(parse_csv_list(args.metrics)))


def handle_metrics_value(args: argparse.Namespace) -> None:
    run_with_runtime_service(
        args,
        lambda svc: svc.get_metric_value(
            metric=args.metric_name,
            group_by=parse_csv_list(args.group_by),
            where=args.where,
            start_time=args.start_time,
            end_time=args.end_time,
            order=parse_csv_list(args.order),
            limit=args.limit,
            time_granularity=args.time_granularity,
        ),
    )


def handle_metrics_query_file(args: argparse.Namespace) -> None:
    payload = json.loads(Path(args.file_path).read_text(encoding="utf-8"))
    if not isinstance(payload, list):
        raise AgentRuntimeCliException("Query file must be a JSON array for /metricflow/query_metrics.")
    run_with_runtime_service(args, lambda svc: svc.query_metrics(payload))


def build_runtime_service(vault: Optional[str]) -> RuntimeService:
    vault_path = settings.resolved_vault(vault)
    cfg = load_config(vault_path)
    client = RestClient(
        host=cfg.get("host") or settings.host,
        pat=cfg.get("pat"),
        username=cfg.get("username"),
        password=cfg.get("password"),
    )
    return RuntimeService(client=client)


def run_with_runtime_service(args: argparse.Namespace, action: Callable[[RuntimeService], Dict[str, Any] | List[Any] | Any]) -> None:
    output_json(action(build_runtime_service(args.vault)))


def parse_csv_list(raw: Optional[str]) -> Optional[List[str]]:
    if raw is None:
        return None
    values = [item.strip() for item in raw.split(",") if item.strip()]
    return values or None


def mask_config(cfg: Dict[str, Any]) -> Dict[str, Any]:
    masked = dict(cfg)
    if masked.get("password"):
        masked["password"] = "***"
    if masked.get("pat"):
        masked["pat"] = "***"
    return masked


def output_json(payload: Any) -> None:
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def output_error(message: str) -> None:
    print(message, file=sys.stderr)


def should_show_traceback(args: Optional[argparse.Namespace]) -> bool:
    if args is not None and bool(getattr(args, "debug", False)):
        return True
    return os.getenv("AGENT_RUNTIME_CLI_DEBUG", "").strip() in {"1", "true", "TRUE", "yes", "YES"}


def add_help_alias(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("-help", action="help", help="show this help message and exit")


def add_vault_arg(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--vault", required=False)


def create_subparser(subparsers: argparse._SubParsersAction, name: str, help_text: str) -> argparse.ArgumentParser:
    parser = subparsers.add_parser(name, help=help_text)
    add_help_alias(parser)
    return parser


def register_init_command(subparsers: argparse._SubParsersAction) -> None:
    init_parser = create_subparser(subparsers, "init", "Initialize local vault and connection configuration")
    init_parser.add_argument("--vault", required=False)
    init_parser.add_argument("--host", required=False)
    init_parser.add_argument("--username", required=False)
    init_parser.add_argument("--password", required=False)
    init_parser.add_argument("--pat", required=False)
    init_parser.set_defaults(handler=handle_init)


def register_config_command(subparsers: argparse._SubParsersAction) -> None:
    config_parser = create_subparser(subparsers, "config", "Show current configuration")
    add_vault_arg(config_parser)
    config_parser.set_defaults(handler=handle_config)


def register_discover_command(subparsers: argparse._SubParsersAction) -> None:
    discover_parser = create_subparser(subparsers, "discover", "Output a list of discoverable commands")
    discover_parser.set_defaults(handler=handle_discover)


def register_runtime_commands(subparsers: argparse._SubParsersAction) -> None:
    health_parser = create_subparser(subparsers, "health", "Call /metricflow/health")
    add_vault_arg(health_parser)
    health_parser.set_defaults(handler=handle_health)

    date_parser = create_subparser(subparsers, "date", "Call /metricflow/current_date")
    add_vault_arg(date_parser)
    date_parser.set_defaults(handler=handle_current_date)


def register_metrics_commands(subparsers: argparse._SubParsersAction) -> None:
    metrics_parser = create_subparser(subparsers, "metrics", "Metric query commands")
    metrics_sub = metrics_parser.add_subparsers(dest="metrics_cmd", required=True)

    metrics_list = create_subparser(metrics_sub, "list", "Call /metricflow/list_metrics")
    add_vault_arg(metrics_list)
    metrics_list.set_defaults(handler=handle_metrics_list)

    dimensions = create_subparser(metrics_sub, "dimensions", "Call /metricflow/dimensions_by_metric")
    dimensions.add_argument("metric_name")
    add_vault_arg(dimensions)
    dimensions.set_defaults(handler=handle_metrics_dimensions)

    find_dimensions = create_subparser(metrics_sub, "find-dimensions", "Call /metricflow/find_dimensions")
    find_dimensions.add_argument("--metrics", required=True, help="Comma-separated metrics, e.g. m1,m2")
    add_vault_arg(find_dimensions)
    find_dimensions.set_defaults(handler=handle_metrics_find_dimensions)

    metric_value = create_subparser(metrics_sub, "value", "Call /metricflow/get_metric_value")
    metric_value.add_argument("metric_name")
    metric_value.add_argument("--group-by", required=False, help="Comma-separated dimensions")
    metric_value.add_argument("--where", required=False)
    metric_value.add_argument("--start-time", required=False, help="ISO datetime")
    metric_value.add_argument("--end-time", required=False, help="ISO datetime")
    metric_value.add_argument("--order", required=False, help="Comma-separated order fields")
    metric_value.add_argument("--limit", required=False, type=int)
    metric_value.add_argument("--time-granularity", required=False)
    add_vault_arg(metric_value)
    metric_value.set_defaults(handler=handle_metrics_value)

    query_file = create_subparser(metrics_sub, "query-file", "Call /metricflow/query_metrics from JSON file")
    query_file.add_argument("file_path")
    add_vault_arg(query_file)
    query_file.set_defaults(handler=handle_metrics_query_file)


if __name__ == "__main__":
    run()
