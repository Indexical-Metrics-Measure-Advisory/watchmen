from __future__ import annotations

import argparse
import json
import os
import sys
import traceback
from pathlib import Path
from typing import Any, Callable, Dict, Optional

from agent_cli.exceptions import AgentCliException
from agent_cli.http_client import RestClient
from agent_cli.settings import settings
from agent_cli.sync_service import SyncService
from agent_cli.vault import ENUM_DIR, PIPELINE_DIR, TOPIC_DIR, ensure_vault, list_local_files, load_config, save_config

DISCOVER_COMMANDS = {
    "init": ["--vault", "--host", "--username", "--password", "--pat"],
    "pull": ["--target", "--vault"],
    "push": ["--target", "--vault"],
    "topic pull": ["topic_id", "--vault"],
    "topic pull-name": ["topic_name", "--vault"],
    "topic push-file": ["file_path", "--vault"],
    "topic list": ["--vault"],
    "topic list-remote": ["--vault"],
    "pipeline pull": ["pipeline_id", "--vault"],
    "pipeline pull-name": ["pipeline_name", "--vault"],
    "pipeline list": ["--vault"],
    "pipeline list-remote": ["--vault"],
    "enum pull": ["enum_id", "--vault"],
    "enum pull-name": ["enum_name", "--vault"],
    "enum push-file": ["file_path", "--vault"],
    "enum list": ["--vault"],
    "enum list-remote": ["--vault"],
    "tenant": ["--vault"],
    "config": ["--vault"],
    "discover": [],
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
    except AgentCliException as e:
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
    parser = argparse.ArgumentParser(prog="agent-cli", description="Watchmen Topic/Pipeline sync CLI")
    parser.add_argument("--debug", action="store_true", help="Print exception traceback for debugging")
    add_help_alias(parser)
    subparsers = parser.add_subparsers(dest="command", required=True)
    register_init_command(subparsers)
    register_sync_commands(subparsers)
    register_topic_commands(subparsers)
    register_pipeline_commands(subparsers)
    register_enum_commands(subparsers)
    register_tenant_command(subparsers)
    register_config_commands(subparsers)
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
    
    # 关键修改：如果 vault 目录不存在，显式创建它
    if not vault_path.exists():
        vault_path.mkdir(parents=True, exist_ok=True)
        
    ensure_vault(vault_path)
    save_config(vault_path, config)
    print(f"Initialized vault: {vault_path}")


def handle_pull(args: argparse.Namespace) -> None:
    run_with_sync_service(args, lambda svc: svc.pull(args.target))


def handle_push(args: argparse.Namespace) -> None:
    run_with_sync_service(args, lambda svc: svc.push(args.target))


def handle_topic_pull(args: argparse.Namespace) -> None:
    run_with_sync_service(args, lambda svc: svc.pull_one_topic(args.topic_id))


def handle_topic_pull_name(args: argparse.Namespace) -> None:
    run_with_sync_service(args, lambda svc: svc.pull_topics_by_name(args.topic_name))


def handle_topic_push_file(args: argparse.Namespace) -> None:
    run_with_sync_service(args, lambda svc: svc.push_topic_yaml_file(Path(args.file_path)))


def handle_pipeline_pull(args: argparse.Namespace) -> None:
    run_with_sync_service(args, lambda svc: {"pipelineId": svc.pull_one_pipeline(args.pipeline_id).get("pipelineId")})

def handle_pipeline_pull_name(args: argparse.Namespace) -> None:
    run_with_sync_service(args, lambda svc: svc.pull_pipelines_by_name(args.pipeline_name))


def handle_topic_list(args: argparse.Namespace) -> None:
    vault_path = settings.resolved_vault(args.vault)
    print_entity_file_list(vault_path, TOPIC_DIR)


def handle_topic_list_remote(args: argparse.Namespace) -> None:
    run_with_sync_service(args, lambda svc: svc.list_topics_from_server())


def handle_pipeline_list(args: argparse.Namespace) -> None:
    vault_path = settings.resolved_vault(args.vault)
    print_entity_file_list(vault_path, PIPELINE_DIR)


def handle_pipeline_list_remote(args: argparse.Namespace) -> None:
    run_with_sync_service(args, lambda svc: svc.list_pipelines_from_server())


def handle_enum_pull(args: argparse.Namespace) -> None:
    run_with_sync_service(args, lambda svc: svc.pull_one_enum(args.enum_id))


def handle_enum_pull_name(args: argparse.Namespace) -> None:
    run_with_sync_service(args, lambda svc: svc.pull_enums_by_name(args.enum_name))


def handle_enum_push_file(args: argparse.Namespace) -> None:
    run_with_sync_service(args, lambda svc: svc.push_enum_yaml_file(Path(args.file_path)))


def handle_enum_list(args: argparse.Namespace) -> None:
    vault_path = settings.resolved_vault(args.vault)
    print_entity_file_list(vault_path, ENUM_DIR)


def handle_enum_list_remote(args: argparse.Namespace) -> None:
    run_with_sync_service(args, lambda svc: svc.list_enums_from_server())


def handle_tenant_info(args: argparse.Namespace) -> None:
    run_with_sync_service(args, lambda svc: svc.resolve_tenant_info())


def handle_config_show(args: argparse.Namespace) -> None:
    vault_path = settings.resolved_vault(args.vault)
    cfg = load_config(vault_path)
    output_json({"vault": str(vault_path), **mask_config(cfg)})


def handle_discover(args: argparse.Namespace) -> None:
    output_json({"name": "agent-cli", "commands": DISCOVER_COMMANDS})


def build_sync_service(vault: Optional[str]) -> SyncService:
    vault_path = settings.resolved_vault(vault)
    cfg = load_config(vault_path)
    client = RestClient(
        host=cfg.get("host") or settings.host,
        pat=cfg.get("pat"),
        username=cfg.get("username"),
        password=cfg.get("password"),
    )
    return SyncService(client=client, vault_path=vault_path)


def print_entity_file_list(vault_path: Path, entity_dir_name: str) -> None:
    files = [str(path.relative_to(vault_path)) for path in list_local_files(vault_path, entity_dir_name)]
    output_json({"count": len(files), "files": files})


def mask_config(cfg: Dict[str, Any]) -> Dict[str, Any]:
    masked = dict(cfg)
    if masked.get("password"):
        masked["password"] = "***"
    if masked.get("pat"):
        masked["pat"] = "***"
    return masked


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
    init_parser.add_argument("--vault", required=False, help="Local directory, defaults to current directory or AGENT_CLI_VAULT")
    init_parser.add_argument("--host", required=False, help="Watchmen REST API host, e.g. http://localhost:8000")
    init_parser.add_argument("--username", required=False, help="Login username")
    init_parser.add_argument("--password", required=False, help="Login password")
    init_parser.add_argument("--pat", required=False, help="Personal Access Token")
    init_parser.set_defaults(handler=handle_init)


def register_sync_commands(subparsers: argparse._SubParsersAction) -> None:
    pull_parser = create_subparser(subparsers, "pull", "Pull data from server to local")
    pull_parser.add_argument("--target", choices=["topic", "pipeline", "all"], default="all")
    add_vault_arg(pull_parser)
    pull_parser.set_defaults(handler=handle_pull)

    push_parser = create_subparser(subparsers, "push", "Push local modifications to server")
    push_parser.add_argument("--target", choices=["topic", "pipeline", "all"], default="all")
    add_vault_arg(push_parser)
    push_parser.set_defaults(handler=handle_push)


def register_topic_commands(subparsers: argparse._SubParsersAction) -> None:
    topic_parser = create_subparser(subparsers, "topic", "Fine-grained topic commands")
    topic_sub = topic_parser.add_subparsers(dest="topic_cmd", required=True)

    topic_pull = create_subparser(topic_sub, "pull", "Pull a specific topic to local by ID")
    topic_pull.add_argument("topic_id")
    add_vault_arg(topic_pull)
    topic_pull.set_defaults(handler=handle_topic_pull)

    topic_pull_name = create_subparser(topic_sub, "pull-name", "Pull a specific topic to local by name")
    topic_pull_name.add_argument("topic_name")
    add_vault_arg(topic_pull_name)
    topic_pull_name.set_defaults(handler=handle_topic_pull_name)

    topic_push_file = create_subparser(topic_sub, "push-file", "Push a local YAML topic file to server")
    topic_push_file.add_argument("file_path", help="Path to the local .yml or .yaml file")
    add_vault_arg(topic_push_file)
    topic_push_file.set_defaults(handler=handle_topic_push_file)

    topic_list = create_subparser(topic_sub, "list", "List local topic files")
    add_vault_arg(topic_list)
    topic_list.set_defaults(handler=handle_topic_list)

    topic_list_remote = create_subparser(topic_sub, "list-remote", "List all topics available on the server")
    add_vault_arg(topic_list_remote)
    topic_list_remote.set_defaults(handler=handle_topic_list_remote)


def register_pipeline_commands(subparsers: argparse._SubParsersAction) -> None:
    pipeline_parser = create_subparser(subparsers, "pipeline", "Fine-grained pipeline commands")
    pipeline_sub = pipeline_parser.add_subparsers(dest="pipeline_cmd", required=True)

    pipeline_pull = create_subparser(pipeline_sub, "pull", "Pull a specific pipeline to local by ID")
    pipeline_pull.add_argument("pipeline_id")
    add_vault_arg(pipeline_pull)
    pipeline_pull.set_defaults(handler=handle_pipeline_pull)

    pipeline_pull_name = create_subparser(pipeline_sub, "pull-name", "Pull pipelines to local by name")
    pipeline_pull_name.add_argument("pipeline_name")
    add_vault_arg(pipeline_pull_name)
    pipeline_pull_name.set_defaults(handler=handle_pipeline_pull_name)

    pipeline_list = create_subparser(pipeline_sub, "list", "List local pipeline files")
    add_vault_arg(pipeline_list)
    pipeline_list.set_defaults(handler=handle_pipeline_list)

    pipeline_list_remote = create_subparser(pipeline_sub, "list-remote", "List all pipelines available on the server")
    add_vault_arg(pipeline_list_remote)
    pipeline_list_remote.set_defaults(handler=handle_pipeline_list_remote)


def register_enum_commands(subparsers: argparse._SubParsersAction) -> None:
    enum_parser = create_subparser(subparsers, "enum", "Fine-grained enum commands")
    enum_sub = enum_parser.add_subparsers(dest="enum_cmd", required=True)

    enum_pull = create_subparser(enum_sub, "pull", "Pull a specific enum to local by ID")
    enum_pull.add_argument("enum_id")
    add_vault_arg(enum_pull)
    enum_pull.set_defaults(handler=handle_enum_pull)

    enum_pull_name = create_subparser(enum_sub, "pull-name", "Pull enums to local by name")
    enum_pull_name.add_argument("enum_name")
    add_vault_arg(enum_pull_name)
    enum_pull_name.set_defaults(handler=handle_enum_pull_name)

    enum_push_file = create_subparser(enum_sub, "push-file", "Push a local YAML enum file to server")
    enum_push_file.add_argument("file_path", help="Path to the local .yml or .yaml file")
    add_vault_arg(enum_push_file)
    enum_push_file.set_defaults(handler=handle_enum_push_file)

    enum_list = create_subparser(enum_sub, "list", "List local enum files")
    add_vault_arg(enum_list)
    enum_list.set_defaults(handler=handle_enum_list)

    enum_list_remote = create_subparser(enum_sub, "list-remote", "List all enums available on the server")
    add_vault_arg(enum_list_remote)
    enum_list_remote.set_defaults(handler=handle_enum_list_remote)


def register_tenant_command(subparsers: argparse._SubParsersAction) -> None:
    tenant_parser = create_subparser(subparsers, "tenant", "Resolve tenant information from current PAT")
    add_vault_arg(tenant_parser)
    tenant_parser.set_defaults(handler=handle_tenant_info)


def register_config_commands(subparsers: argparse._SubParsersAction) -> None:
    config_parser = create_subparser(subparsers, "config", "Show current configuration")
    add_vault_arg(config_parser)
    config_parser.set_defaults(handler=handle_config_show)

    discover_parser = create_subparser(subparsers, "discover", "Output a list of discoverable commands")
    discover_parser.set_defaults(handler=handle_discover)


def run_with_sync_service(args: argparse.Namespace, action: Callable[[SyncService], Dict[str, Any]]) -> None:
    output_json(action(build_sync_service(args.vault)))


def output_json(payload: Any) -> None:
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def output_error(message: str) -> None:
    print(message, file=sys.stderr)


def should_show_traceback(args: Optional[argparse.Namespace]) -> bool:
    if args is not None and bool(getattr(args, "debug", False)):
        return True
    return os.getenv("AGENT_CLI_DEBUG", "").strip() in {"1", "true", "TRUE", "yes", "YES"}

if __name__ == "__main__":
    run()
