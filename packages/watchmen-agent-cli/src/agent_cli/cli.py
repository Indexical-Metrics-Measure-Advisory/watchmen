from __future__ import annotations

import traceback
from argparse import Namespace
from typing import Callable, Optional

import typer

from agent_cli.exceptions import AgentCliException
from agent_cli.main import (
    get_cli_version,
    handle_config_show,
    handle_datasource_list_remote,
    handle_discover,
    handle_enum_list,
    handle_enum_list_remote,
    handle_enum_pull,
    handle_enum_pull_name,
    handle_enum_push_file,
    handle_ingest_model_create_raw_topic,
    handle_ingest_model_list,
    handle_ingest_model_list_remote,
    handle_ingest_model_pull,
    handle_ingest_model_push_file,
    handle_ingest_module_list,
    handle_ingest_module_list_remote,
    handle_ingest_module_pull,
    handle_ingest_module_push_file,
    handle_ingest_table_list,
    handle_ingest_table_list_remote,
    handle_ingest_table_pull,
    handle_ingest_table_push_file,
    handle_init,
    handle_metric_list,
    handle_metric_list_remote,
    handle_metric_pull_name,
    handle_metric_push_file,
    handle_ontology_list,
    handle_ontology_list_remote,
    handle_ontology_pull_name,
    handle_ontology_push_file,
    handle_pipeline_list,
    handle_pipeline_list_remote,
    handle_pipeline_pull,
    handle_pipeline_pull_name,
    handle_pipeline_push_file,
    handle_pull,
    handle_push,
    handle_semantic_list,
    handle_semantic_list_remote,
    handle_semantic_pull_name,
    handle_semantic_push_file,
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
semantic_app = typer.Typer(help="MetricFlow semantic model commands")
metric_app = typer.Typer(help="MetricFlow metric commands")
ingest_app = typer.Typer(help="Ingest config YAML commands")
ingest_table_app = typer.Typer(help="Collector table config commands")
ingest_model_app = typer.Typer(help="Collector model config commands")
ingest_module_app = typer.Typer(help="Collector module config commands")
datasource_app = typer.Typer(help="DataSource commands")
ontology_app = typer.Typer(help="Ontology YAML commands")
app.add_typer(topic_app, name="topic")
app.add_typer(pipeline_app, name="pipeline")
app.add_typer(enum_app, name="enum")
app.add_typer(semantic_app, name="semantic")
app.add_typer(metric_app, name="metric")
app.add_typer(ingest_app, name="ingest")
ingest_app.add_typer(ingest_table_app, name="table")
ingest_app.add_typer(ingest_model_app, name="model")
ingest_app.add_typer(ingest_module_app, name="module")
app.add_typer(datasource_app, name="datasource")
app.add_typer(ontology_app, name="ontology")


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


def _version_callback(value: bool) -> None:
    if value:
        typer.echo(f"agent-cli {get_cli_version()}")
        raise typer.Exit()


@app.callback(invoke_without_command=True)
def cli_callback(
    ctx: typer.Context,
    debug: bool = typer.Option(False, "--debug", help="Print exception traceback for debugging"),
    version: bool = typer.Option(False, "--version", callback=_version_callback, is_eager=True, help="Show version and exit"),
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
    dry_run: bool = typer.Option(False, "--dry-run", help="Validate only, do not persist"),
) -> None:
    _run_with_guard(ctx, lambda: handle_push(_namespace(target=target, vault=vault, dry_run=dry_run)))


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
    dry_run: bool = typer.Option(False, "--dry-run", help="Validate only, do not persist"),
) -> None:
    _run_with_guard(ctx, lambda: handle_topic_push_file(_namespace(file_path=file_path, vault=vault, dry_run=dry_run)))


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


@pipeline_app.command("push-file")
def pipeline_push_file_command(
    ctx: typer.Context,
    file_path: str,
    vault: Optional[str] = typer.Option(None, "--vault"),
    dry_run: bool = typer.Option(False, "--dry-run", help="Validate only, do not persist"),
) -> None:
    _run_with_guard(ctx, lambda: handle_pipeline_push_file(_namespace(file_path=file_path, vault=vault, dry_run=dry_run)))


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


@semantic_app.command("pull-name")
def semantic_pull_name_command(
    ctx: typer.Context,
    model_name: str,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_semantic_pull_name(_namespace(model_name=model_name, vault=vault)))


@semantic_app.command("push-file")
def semantic_push_file_command(
    ctx: typer.Context,
    file_path: str,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_semantic_push_file(_namespace(file_path=file_path, vault=vault)))


@semantic_app.command("list")
def semantic_list_command(
    ctx: typer.Context,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_semantic_list(_namespace(vault=vault)))


@semantic_app.command("list-remote")
def semantic_list_remote_command(
    ctx: typer.Context,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_semantic_list_remote(_namespace(vault=vault)))


@metric_app.command("pull-name")
def metric_pull_name_command(
    ctx: typer.Context,
    metric_name: str,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_metric_pull_name(_namespace(metric_name=metric_name, vault=vault)))


@metric_app.command("push-file")
def metric_push_file_command(
    ctx: typer.Context,
    file_path: str,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_metric_push_file(_namespace(file_path=file_path, vault=vault)))


@metric_app.command("list")
def metric_list_command(
    ctx: typer.Context,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_metric_list(_namespace(vault=vault)))


@metric_app.command("list-remote")
def metric_list_remote_command(
    ctx: typer.Context,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_metric_list_remote(_namespace(vault=vault)))


@ingest_table_app.command("pull")
def ingest_table_pull_command(
    ctx: typer.Context,
    table_name: str,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_ingest_table_pull(_namespace(table_name=table_name, vault=vault)))


@ingest_table_app.command("push-file")
def ingest_table_push_file_command(
    ctx: typer.Context,
    file_path: str,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_ingest_table_push_file(_namespace(file_path=file_path, vault=vault)))


@ingest_table_app.command("list")
def ingest_table_list_command(
    ctx: typer.Context,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_ingest_table_list(_namespace(vault=vault)))


@ingest_table_app.command("list-remote")
def ingest_table_list_remote_command(
    ctx: typer.Context,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_ingest_table_list_remote(_namespace(vault=vault)))


@ingest_model_app.command("pull")
def ingest_model_pull_command(
    ctx: typer.Context,
    model_name: str,
    all: bool = typer.Option(False, "--all"),
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_ingest_model_pull(_namespace(model_name=model_name, all=all, vault=vault)))


@ingest_model_app.command("push-file")
def ingest_model_push_file_command(
    ctx: typer.Context,
    file_path: str,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_ingest_model_push_file(_namespace(file_path=file_path, vault=vault)))


@ingest_model_app.command("list")
def ingest_model_list_command(
    ctx: typer.Context,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_ingest_model_list(_namespace(vault=vault)))


@ingest_model_app.command("list-remote")
def ingest_model_list_remote_command(
    ctx: typer.Context,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_ingest_model_list_remote(_namespace(vault=vault)))


@ingest_model_app.command("create-raw-topic")
def ingest_model_create_raw_topic_command(
    ctx: typer.Context,
    model_name: str,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_ingest_model_create_raw_topic(_namespace(model_name=model_name, vault=vault)))


@ingest_module_app.command("pull")
def ingest_module_pull_command(
    ctx: typer.Context,
    module_name: str,
    all: bool = typer.Option(False, "--all"),
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_ingest_module_pull(_namespace(module_name=module_name, all=all, vault=vault)))


@ingest_module_app.command("push-file")
def ingest_module_push_file_command(
    ctx: typer.Context,
    file_path: str,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_ingest_module_push_file(_namespace(file_path=file_path, vault=vault)))


@ingest_module_app.command("list")
def ingest_module_list_command(
    ctx: typer.Context,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_ingest_module_list(_namespace(vault=vault)))


@ingest_module_app.command("list-remote")
def ingest_module_list_remote_command(
    ctx: typer.Context,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_ingest_module_list_remote(_namespace(vault=vault)))


@datasource_app.command("list-remote")
def datasource_list_remote_command(
    ctx: typer.Context,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_datasource_list_remote(_namespace(vault=vault)))


@ontology_app.command("pull-name")
def ontology_pull_name_command(
    ctx: typer.Context,
    ontology_name: str,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_ontology_pull_name(_namespace(ontology_name=ontology_name, vault=vault)))


@ontology_app.command("push-file")
def ontology_push_file_command(
    ctx: typer.Context,
    file_path: str,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_ontology_push_file(_namespace(file_path=file_path, vault=vault)))


@ontology_app.command("list")
def ontology_list_command(
    ctx: typer.Context,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_ontology_list(_namespace(vault=vault)))


@ontology_app.command("list-remote")
def ontology_list_remote_command(
    ctx: typer.Context,
    vault: Optional[str] = typer.Option(None, "--vault"),
) -> None:
    _run_with_guard(ctx, lambda: handle_ontology_list_remote(_namespace(vault=vault)))


def run() -> None:
    app(prog_name="agent-cli")
