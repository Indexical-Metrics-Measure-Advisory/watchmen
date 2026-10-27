from __future__ import annotations

import argparse
import json
import sys
import time
from typing import Any, Callable, Dict, Optional
from uuid import uuid4

import typer

from agent_cli.collector_service import CollectorService, load_records
from agent_cli.diagnostics import build_diagnosis
from agent_cli.exceptions import AgentCliException, ExecutionException
from agent_cli.http_client import RestClient
from agent_cli.operation_log import append_query_log, now_iso, read_query_log, summarize_result
from agent_cli.repair_service import RepairService
from agent_cli.settings import settings
from agent_cli.vault import load_config

DISCOVER_COMMANDS = {
    "collector run": ["--model|--table", "--records-file", "--pipeline", "--start-time", "--end-time", "--wait", "--auto-fix", "--max-fix-attempts", "--vault"],
    "collector status": ["event_trigger_id", "--vault"],
    "collector logs": ["event_trigger_id", "--no-pipeline-logs", "--errors-only", "--vault"],
    "collector diagnose": ["event_trigger_id", "--vault"],
    "collector fix-plan": ["event_trigger_id", "--output", "--vault"],
    "collector apply-plan": ["file_path", "--yes", "--vault"],
    "collector retry": ["event_trigger_id", "--yes", "--wait", "--vault"],
    "collector calls": ["--correlation-id", "--limit", "--vault"],
}


def resolve_correlation_id(args: argparse.Namespace) -> str:
    return getattr(args, "correlation_id", None) or settings.correlation_id or f"cli-{uuid4()}"


def build_services(args: argparse.Namespace, correlation_id: str) -> tuple[CollectorService, RepairService]:
    vault_path = settings.resolved_vault(args.vault)
    config = load_config(vault_path)
    client = RestClient(
        host=config.get("host") or settings.host,
        pat=config.get("pat"),
        username=config.get("username"),
        password=config.get("password"),
        correlation_id=correlation_id,
    )
    collector = CollectorService(client)
    return collector, RepairService(collector, client.host)


def diagnose(collector: CollectorService, event_trigger_id: int) -> tuple[Dict[str, Any], Dict[str, Any], list]:
    detail = collector.get_execution_detail(event_trigger_id)
    pages = collector.get_pipeline_logs_for_detail(detail)
    return build_diagnosis(event_trigger_id, detail, pages), detail, pages


def execute(
    args: argparse.Namespace,
    command: str,
    action: Callable[[CollectorService, RepairService], Dict[str, Any]],
    fail_on_execution_error: bool = False,
) -> None:
    vault_path = settings.resolved_vault(args.vault)
    started = time.perf_counter()
    correlation_id = resolve_correlation_id(args)
    entry = {
        "ts": now_iso(),
        "command": command,
        "correlationId": correlation_id,
        "params": {
            key: value for key, value in vars(args).items()
            if key not in {"handler", "debug", "pat", "password", "records", "ctx", "guarded", "namespace"}
            and value is not None
        },
    }
    try:
        collector, repair = build_services(args, correlation_id)
        result = action(collector, repair)
        failed = fail_on_execution_error and result.get("status") in ("FAILED", "PARTIAL")
        entry.update({"status": "error" if failed else "ok", "durationMs": round((time.perf_counter() - started) * 1000)})
        entry["resultSummary"] = summarize_result(result)
        print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
        if failed:
            raise ExecutionException(f"{command} finished with status {result['status']}.")
    except Exception as error:
        entry.update({
            "status": "error",
            "durationMs": round((time.perf_counter() - started) * 1000),
            "error": str(error),
        })
        raise
    finally:
        try:
            append_query_log(vault_path, entry)
        except OSError as error:
            print(f"Warning: failed to write local operation log: {error}", file=sys.stderr)


def validate_wait_arguments(args: argparse.Namespace) -> None:
    if args.timeout <= 0 or args.poll_interval <= 0:
        raise AgentCliException("Timeout and poll interval must be positive.")


def handle_run(args: argparse.Namespace) -> None:
    def action(collector: CollectorService, repair: RepairService) -> Dict[str, Any]:
        validate_wait_arguments(args)
        if args.auto_fix not in ("off", "safe"):
            raise AgentCliException("--auto-fix must be off or safe.")
        if args.max_fix_attempts < 0:
            raise AgentCliException("Fix attempts must be zero or greater.")
        if args.auto_fix == "safe" and not args.wait:
            raise AgentCliException("--auto-fix safe requires --wait.")
        model_trigger = bool(args.model and not args.table and not args.records_file)
        table_trigger = bool(args.table and not args.model)
        if not model_trigger and not table_trigger:
            raise AgentCliException("Choose model, table with records-file, or table time-window trigger.")
        if args.pipeline and (args.model or args.records_file):
            raise AgentCliException("--pipeline is supported only for a table time-window trigger.")
        records = load_records(args.records_file) if args.records_file else None
        pipeline_id = collector.find_pipeline_id(args.pipeline) if args.pipeline else None
        event = collector.trigger(
            model_name=args.model,
            table_name=args.table,
            records=records,
            pipeline_id=pipeline_id,
            start_time=args.start_time,
            end_time=args.end_time,
        )
        event_id = event.get("eventTriggerId")
        if not event_id:
            raise AgentCliException("Collector trigger returned no eventTriggerId.")
        result = {"eventTriggerId": event_id, "status": "TRIGGERED"}
        if not args.wait:
            return result
        collector.wait_for_event(event_id, args.timeout, args.poll_interval)
        diagnosis, _, _ = diagnose(collector, event_id)
        result.update(diagnosis)
        attempts = 0
        while args.auto_fix == "safe" and diagnosis["derivedStatus"] in ("FAILED", "PARTIAL") and attempts < args.max_fix_attempts:
            plan = repair.create_plan(diagnosis)
            if not plan["actions"][0].get("safeAutoEligible"):
                result["autoFixStopped"] = "No safe automatic action is eligible; create a fix plan for manual review."
                break
            repair_result = repair.apply_plan(
                plan, diagnosis, confirmed=False, automatic=True,
                timeout_seconds=args.timeout, poll_interval=args.poll_interval,
            )
            attempts += 1
            result.setdefault("fixAttempts", []).append(repair_result)
            if repair_result["status"] == "RECOVERED":
                result["status"] = "RECOVERED"
                return result
            result["autoFixStopped"] = "Pipeline retry still failed; repeated automatic repair is stopped."
            break
        result["fixAttemptCount"] = attempts
        result["status"] = diagnosis["derivedStatus"]
        return result

    execute(args, "collector run", action, fail_on_execution_error=True)


def handle_status(args: argparse.Namespace) -> None:
    execute(args, "collector status", lambda collector, _: diagnose(collector, args.event_trigger_id)[0])


def handle_logs(args: argparse.Namespace) -> None:
    def action(collector: CollectorService, _: RepairService) -> Dict[str, Any]:
        diagnosis, detail, pages = diagnose(collector, args.event_trigger_id)
        result = {
            "eventTriggerId": args.event_trigger_id,
            "derivedStatus": diagnosis["derivedStatus"],
            "collector": detail,
            "pipelineLogs": pages if args.pipeline_logs else [],
        }
        if args.errors_only:
            result["collector"] = {"errors": detail.get("errors") or []}
            result["pipelineLogs"] = [
                page for page in result["pipelineLogs"]
                if any(log.get("status") == "ERROR" or log.get("error") for log in page.get("data") or [])
            ]
        return result

    execute(args, "collector logs", action)


def handle_diagnose(args: argparse.Namespace) -> None:
    execute(args, "collector diagnose", lambda collector, _: diagnose(collector, args.event_trigger_id)[0])


def handle_fix_plan(args: argparse.Namespace) -> None:
    def action(collector: CollectorService, repair: RepairService) -> Dict[str, Any]:
        diagnosis, _, _ = diagnose(collector, args.event_trigger_id)
        plan = repair.create_plan(diagnosis)
        repair.write_plan(plan, args.output)
        return plan

    execute(args, "collector fix-plan", action)


def handle_apply_plan(args: argparse.Namespace) -> None:
    def action(collector: CollectorService, repair: RepairService) -> Dict[str, Any]:
        validate_wait_arguments(args)
        plan = repair.load_plan(args.file_path)
        diagnosis, _, _ = diagnose(collector, int(plan["eventTriggerId"]))
        return repair.apply_plan(
            plan, diagnosis, confirmed=args.yes,
            timeout_seconds=args.timeout, poll_interval=args.poll_interval,
        )

    execute(args, "collector apply-plan", action, fail_on_execution_error=True)


def handle_retry(args: argparse.Namespace) -> None:
    def action(collector: CollectorService, _: RepairService) -> Dict[str, Any]:
        validate_wait_arguments(args)
        if not args.yes:
            raise AgentCliException("Retrying a collector event requires --yes.")
        diagnosis, _, _ = diagnose(collector, args.event_trigger_id)
        if not diagnosis["eventRetryEligible"]:
            raise AgentCliException("Event retry is blocked because successful Pipeline execution exists or the event is unfinished.")
        result = collector.retry_event(args.event_trigger_id)
        new_event_id = result["newEventTriggerId"]
        if not new_event_id:
            raise AgentCliException("Collector retry returned no new eventTriggerId.")
        result["status"] = "TRIGGERED"
        if args.wait:
            collector.wait_for_event(new_event_id, args.timeout, args.poll_interval)
            new_diagnosis, _, _ = diagnose(collector, new_event_id)
            result.update(new_diagnosis)
            result["status"] = new_diagnosis["derivedStatus"]
        return result

    execute(args, "collector retry", action, fail_on_execution_error=True)


def handle_calls(args: argparse.Namespace) -> None:
    vault_path = settings.resolved_vault(args.vault)
    entries = read_query_log(vault_path, args.correlation_id, args.limit)
    print(json.dumps({"count": len(entries), "entries": entries}, ensure_ascii=False, indent=2))


def add_common_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--vault", required=False)
    parser.add_argument("--correlation-id", required=False)


def add_wait_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--timeout", type=int, default=300)
    parser.add_argument("--poll-interval", type=float, default=2.0)


def register_argparse(subparsers: argparse._SubParsersAction) -> None:
    parser = subparsers.add_parser("collector", help="Collector execution, diagnosis and controlled repair")
    commands = parser.add_subparsers(dest="collector_cmd", required=True)

    run = commands.add_parser("run")
    run.add_argument("--model")
    run.add_argument("--table")
    run.add_argument("--records-file")
    run.add_argument("--pipeline")
    run.add_argument("--start-time")
    run.add_argument("--end-time")
    run.add_argument("--wait", action="store_true")
    run.add_argument("--auto-fix", choices=("off", "safe"), default="off")
    run.add_argument("--max-fix-attempts", type=int, default=2)
    add_wait_arguments(run)
    add_common_arguments(run)
    run.set_defaults(handler=handle_run)

    for name, handler in (("status", handle_status), ("logs", handle_logs), ("diagnose", handle_diagnose)):
        command = commands.add_parser(name)
        command.add_argument("event_trigger_id", type=int)
        if name == "logs":
            command.add_argument("--pipeline-logs", action=argparse.BooleanOptionalAction, default=True)
            command.add_argument("--errors-only", action="store_true")
        add_common_arguments(command)
        command.set_defaults(handler=handler)

    fix_plan = commands.add_parser("fix-plan")
    fix_plan.add_argument("event_trigger_id", type=int)
    fix_plan.add_argument("--output", required=True)
    add_common_arguments(fix_plan)
    fix_plan.set_defaults(handler=handle_fix_plan)

    apply_plan = commands.add_parser("apply-plan")
    apply_plan.add_argument("file_path")
    apply_plan.add_argument("--yes", action="store_true")
    add_wait_arguments(apply_plan)
    add_common_arguments(apply_plan)
    apply_plan.set_defaults(handler=handle_apply_plan)

    retry = commands.add_parser("retry")
    retry.add_argument("event_trigger_id", type=int)
    retry.add_argument("--yes", action="store_true")
    retry.add_argument("--wait", action="store_true")
    add_wait_arguments(retry)
    add_common_arguments(retry)
    retry.set_defaults(handler=handle_retry)

    calls = commands.add_parser("calls")
    calls.add_argument("--correlation-id")
    calls.add_argument("--limit", type=int, default=100)
    calls.add_argument("--vault")
    calls.set_defaults(handler=handle_calls)


def register_typer(app: typer.Typer, guarded: Callable[[typer.Context, Callable[[], None]], None]) -> None:
    collector = typer.Typer(help="Collector execution, diagnosis and controlled repair")
    app.add_typer(collector, name="collector")

    def namespace(**values: Any) -> argparse.Namespace:
        return argparse.Namespace(**values)

    @collector.command("run")
    def run_command(
        ctx: typer.Context,
        model: Optional[str] = typer.Option(None, "--model"),
        table: Optional[str] = typer.Option(None, "--table"),
        records_file: Optional[str] = typer.Option(None, "--records-file"),
        pipeline: Optional[str] = typer.Option(None, "--pipeline"),
        start_time: Optional[str] = typer.Option(None, "--start-time"),
        end_time: Optional[str] = typer.Option(None, "--end-time"),
        wait: bool = typer.Option(False, "--wait"),
        auto_fix: str = typer.Option("off", "--auto-fix"),
        max_fix_attempts: int = typer.Option(2, "--max-fix-attempts"),
        timeout: int = typer.Option(300, "--timeout"),
        poll_interval: float = typer.Option(2.0, "--poll-interval"),
        vault: Optional[str] = typer.Option(None, "--vault"),
        correlation_id: Optional[str] = typer.Option(None, "--correlation-id"),
    ) -> None:
        args = namespace(**locals())
        guarded(ctx, lambda: handle_run(args))

    @collector.command("status")
    def status_command(
        ctx: typer.Context, event_trigger_id: int,
        vault: Optional[str] = typer.Option(None, "--vault"),
        correlation_id: Optional[str] = typer.Option(None, "--correlation-id"),
    ) -> None:
        args = namespace(event_trigger_id=event_trigger_id, vault=vault, correlation_id=correlation_id)
        guarded(ctx, lambda: handle_status(args))

    @collector.command("logs")
    def logs_command(
        ctx: typer.Context, event_trigger_id: int,
        pipeline_logs: bool = typer.Option(True, "--pipeline-logs/--no-pipeline-logs"),
        errors_only: bool = typer.Option(False, "--errors-only"),
        vault: Optional[str] = typer.Option(None, "--vault"),
        correlation_id: Optional[str] = typer.Option(None, "--correlation-id"),
    ) -> None:
        args = namespace(**locals())
        guarded(ctx, lambda: handle_logs(args))

    @collector.command("diagnose")
    def diagnose_command(
        ctx: typer.Context, event_trigger_id: int,
        vault: Optional[str] = typer.Option(None, "--vault"),
        correlation_id: Optional[str] = typer.Option(None, "--correlation-id"),
    ) -> None:
        args = namespace(event_trigger_id=event_trigger_id, vault=vault, correlation_id=correlation_id)
        guarded(ctx, lambda: handle_diagnose(args))

    @collector.command("fix-plan")
    def fix_plan_command(
        ctx: typer.Context, event_trigger_id: int,
        output: str = typer.Option(..., "--output"),
        vault: Optional[str] = typer.Option(None, "--vault"),
        correlation_id: Optional[str] = typer.Option(None, "--correlation-id"),
    ) -> None:
        args = namespace(**locals())
        guarded(ctx, lambda: handle_fix_plan(args))

    @collector.command("apply-plan")
    def apply_plan_command(
        ctx: typer.Context, file_path: str,
        yes: bool = typer.Option(False, "--yes"),
        timeout: int = typer.Option(300, "--timeout"),
        poll_interval: float = typer.Option(2.0, "--poll-interval"),
        vault: Optional[str] = typer.Option(None, "--vault"),
        correlation_id: Optional[str] = typer.Option(None, "--correlation-id"),
    ) -> None:
        args = namespace(**locals())
        guarded(ctx, lambda: handle_apply_plan(args))

    @collector.command("retry")
    def retry_command(
        ctx: typer.Context, event_trigger_id: int,
        yes: bool = typer.Option(False, "--yes"),
        wait: bool = typer.Option(False, "--wait"),
        timeout: int = typer.Option(300, "--timeout"),
        poll_interval: float = typer.Option(2.0, "--poll-interval"),
        vault: Optional[str] = typer.Option(None, "--vault"),
        correlation_id: Optional[str] = typer.Option(None, "--correlation-id"),
    ) -> None:
        args = namespace(**locals())
        guarded(ctx, lambda: handle_retry(args))

    @collector.command("calls")
    def calls_command(
        correlation_id: Optional[str] = typer.Option(None, "--correlation-id"),
        limit: int = typer.Option(100, "--limit"),
        vault: Optional[str] = typer.Option(None, "--vault"),
    ) -> None:
        handle_calls(namespace(correlation_id=correlation_id, limit=limit, vault=vault))
