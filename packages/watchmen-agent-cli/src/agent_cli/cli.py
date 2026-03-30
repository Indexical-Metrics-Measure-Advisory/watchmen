from __future__ import annotations

import traceback
from argparse import Namespace
from typing import Callable, Optional

import typer

from agent_cli.exceptions import AgentCliException
from agent_cli.main import (
    handle_config_show,
    handle_discover,
    handle_enum_list,
    handle_enum_list_remote,
    handle_enum_pull,
    handle_enum_pull_name,
    handle_enum_push_file,
    handle_init,
    handle_pipeline_list,
    handle_pipeline_list_remote,
    handle_pipeline_pull,
    handle_pipeline_pull_name,
    handle_pull,
    handle_push,
    handle_tenant_info,
    handle_topic_list,
    handle_topic_list_remote,
    handle_topic_pull,
    handle_topic_pull_name,
    handle_topic_push_file,
    output_error,
)

app = typer.Typer(help="Watchmen Topic/Pipeline sync CLI powered by Typer")
topic_app = typer.Typer(help="Fine-grained topic commands")
pipeline_app = typer.Typer(help="Fine-grained pipeline commands")
enum_app = typer.Typer(help="Fine-grained enum commands")
app.add_typer(topic_app, name="topic")
app.add_typer(pipeline_app, name="pipeline")
app.add_typer(enum_app, name="enum")


def _namespace(**kwargs) -> Namespace:
    return Namespace(**kwargs)


def _run_with_guard(ctx: typer.Context, action: Callable[[], None]) -> None:
    try:
        action()
    except AgentCliException as e:
        output_error(f"{e.__class__.__name__}: {e}")
        if ctx.obj and ctx.obj.get("debug"):
            traceback.print_exc()
        raise typer.Exit(getattr(e, "exit_code", 1))
    except Exception as e:
        output_error(f"UnexpectedError: {e}")
        if ctx.obj and ctx.obj.get("debug"):
            traceback.print_exc()
        raise typer.Exit(10)


@app.callback(invoke_without_command=True)
def cli_callback(
    ctx: typer.Context,
    debug: bool = typer.Option(False, "--debug", help="Print exception traceback for debugging"),
) -> None:
    ctx.obj = {"debug": debug}
    if ctx.invoked_subcommand is None:
        typer.echo(ctx.get_help())
        raise typer.Exit()


@app.command("init")
def init_command(
    ctx: typer.Context,
    vault: Optional[str] = typer.Option(None, "--vault"),
    host: Optional[str] = typer.Option(None, "--host"),
    username: Optional[str] = typer.Option(None, "--username"),
    password: Optional[str] = typer.Option(None, "--password"),
    pat: Optional[str] = typer.Option(None, "--pat"),
) -> None:
    _run_with_guard(ctx, lambda: handle_init(_namespace(vault=vault, host=host, username=username, password=password, pat=pat)))


@app.command("pull")
def pull_command(
    ctx: typer.Context,
    target: str = typer.Option("all", "--target", help="topic | pipeline | all"),
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_pull(_namespace(target=target, vault=vault)))


@app.command("push")
def push_command(
    ctx: typer.Context,
    target: str = typer.Option("all", "--target", help="topic | pipeline | all"),
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_push(_namespace(target=target, vault=vault)))


@app.command("tenant")
def tenant_command(
    ctx: typer.Context,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_tenant_info(_namespace(vault=vault)))


@app.command("config")
def config_command(
    ctx: typer.Context,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_config_show(_namespace(vault=vault)))


@app.command("discover")
def discover_command(ctx: typer.Context) -> None:
    _run_with_guard(ctx, lambda: handle_discover(_namespace()))


@topic_app.command("pull")
def topic_pull_command(
    ctx: typer.Context,
    topic_id: str,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_topic_pull(_namespace(topic_id=topic_id, vault=vault)))


@topic_app.command("pull-name")
def topic_pull_name_command(
    ctx: typer.Context,
    topic_name: str,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_topic_pull_name(_namespace(topic_name=topic_name, vault=vault)))


@topic_app.command("push-file")
def topic_push_file_command(
    ctx: typer.Context,
    file_path: str,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_topic_push_file(_namespace(file_path=file_path, vault=vault)))


@topic_app.command("list")
def topic_list_command(
    ctx: typer.Context,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_topic_list(_namespace(vault=vault)))


@topic_app.command("list-remote")
def topic_list_remote_command(
    ctx: typer.Context,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_topic_list_remote(_namespace(vault=vault)))


@pipeline_app.command("pull")
def pipeline_pull_command(
    ctx: typer.Context,
    pipeline_id: str,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_pipeline_pull(_namespace(pipeline_id=pipeline_id, vault=vault)))


@pipeline_app.command("pull-name")
def pipeline_pull_name_command(
    ctx: typer.Context,
    pipeline_name: str,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_pipeline_pull_name(_namespace(pipeline_name=pipeline_name, vault=vault)))


@pipeline_app.command("list")
def pipeline_list_command(
    ctx: typer.Context,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_pipeline_list(_namespace(vault=vault)))


@pipeline_app.command("list-remote")
def pipeline_list_remote_command(
    ctx: typer.Context,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_pipeline_list_remote(_namespace(vault=vault)))


@enum_app.command("pull")
def enum_pull_command(
    ctx: typer.Context,
    enum_id: str,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_enum_pull(_namespace(enum_id=enum_id, vault=vault)))


@enum_app.command("pull-name")
def enum_pull_name_command(
    ctx: typer.Context,
    enum_name: str,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_enum_pull_name(_namespace(enum_name=enum_name, vault=vault)))


@enum_app.command("push-file")
def enum_push_file_command(
    ctx: typer.Context,
    file_path: str,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_enum_push_file(_namespace(file_path=file_path, vault=vault)))


@enum_app.command("list")
def enum_list_command(
    ctx: typer.Context,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_enum_list(_namespace(vault=vault)))


@enum_app.command("list-remote")
def enum_list_remote_command(
    ctx: typer.Context,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_enum_list_remote(_namespace(vault=vault)))


def run() -> None:
    app(prog_name="agent-cli")

