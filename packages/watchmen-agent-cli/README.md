# Watchmen Agent CLI

Watchmen Agent CLI is a tool for syncing Topics, Pipelines, Enums, MetricFlow Semantics, Metrics, Ingestion configs, and Virtual Ontologies between a **local vault** and the **Watchmen server**. It also runs Collector events, diagnoses execution failures, and performs explicitly controlled Pipeline retries. It is designed for daily data development, configuration migration, operations, and AI-assisted automation workflows.

It also ships with a reusable Agent Skill (`agent-cli`) that lets AI directly perform sync, Collector operations, and remote listing within a conversation.

## Core Capabilities

- Topic YAML sync (pull by ID/name, push single file, batch push/pull)
- Pipeline YAML sync (pull by ID/name, push single file, batch push/pull)
- Enum codebook sync (pull by ID/name, push single file, remote listing)
- MetricFlow Semantic Model YAML sync (pull by name, push single file, remote listing)
- MetricFlow Metric YAML sync (pull by name, push single file, remote listing)
- Ingest Table/Model/Module YAML sync (pull all, push single file, remote listing)
- Virtual Ontology YAML sync through the standalone `ontology` command group
- Batch pull all modules with `pull --all` (Ontology remains separate)
- Collector model/table/record triggers, optional waiting, status, logs, and diagnosis
- Reviewable fix plans, confirmed Pipeline reruns, guarded event retries, and local call logs
- Automatic multi-entity dependency resolution:
  - Pipelines depend on Topics
  - Topics depend on Enums via `enumId`
- Structured output suitable for consumption by AI and automation pipelines

## Installation

Make sure [Poetry](https://python-poetry.org/) is installed.

```bash
cd packages/watchmen-agent-cli
poetry install
```

It is recommended to install the Skill (callable from skills-compatible agents):

```bash
./scripts/install-skill.sh
```

## Quick Start

1. Initialize the vault and configuration

```bash
poetry run agent-cli init --vault ./my_vault --host <WATCHMEN_HOST> --pat <YOUR_PAT>
```

1. Pull all resources (Topic + Pipeline + Enum + Semantic Model + Metric + Ingest Table/Model/Module)

```bash
poetry run agent-cli pull --all --vault ./my_vault
```

1. Push local changes

```bash
poetry run agent-cli push --target topic --vault ./my_vault
```

## Common Commands

- Init & Config
  - `agent-cli init --vault <vault> --host <host> --pat <token>`
  - `agent-cli config --vault <vault>`
  - `agent-cli tenant --vault <vault>`
- Batch Sync
  - `agent-cli pull --all --vault <vault>`  (pull all modules)
  - `agent-cli pull --target topic|pipeline|enum|semantic|metric|ingest_table|ingest_model|ingest_module --vault <vault>`
  - `agent-cli push --target topic|pipeline --vault <vault>`
- Topic
  - `agent-cli topic pull <topic_id> --vault <vault>`
  - `agent-cli topic pull-name "<topic_name>" --vault <vault>`
  - `agent-cli topic push-file <file_path> --vault <vault>`
  - `agent-cli topic list --vault <vault>`
  - `agent-cli topic list-remote --vault <vault>`
- Pipeline
  - `agent-cli pipeline pull <pipeline_id> --vault <vault>`
  - `agent-cli pipeline pull-name "<pipeline_name>" --vault <vault>`
  - `agent-cli pipeline push-file <file_path> --vault <vault>`
  - `agent-cli pipeline list --vault <vault>`
  - `agent-cli pipeline list-remote --vault <vault>`
- Enum
  - `agent-cli enum pull <enum_id> --vault <vault>`
  - `agent-cli enum pull-name "<enum_name>" --vault <vault>`
  - `agent-cli enum push-file <file_path> --vault <vault>`
  - `agent-cli enum list --vault <vault>`
  - `agent-cli enum list-remote --vault <vault>`
- Semantic Model (MetricFlow)
  - `agent-cli semantic pull-name "<model_name>" --vault <vault>`
  - `agent-cli semantic push-file <file_path> --vault <vault>`
  - `agent-cli semantic list --vault <vault>`
  - `agent-cli semantic list-remote --vault <vault>`
- Metric (MetricFlow)
  - `agent-cli metric pull-name "<metric_name>" --vault <vault>`
  - `agent-cli metric push-file <file_path> --vault <vault>`
  - `agent-cli metric list --vault <vault>`
  - `agent-cli metric list-remote --vault <vault>`
- Collector
  - `agent-cli collector run --model "<model_name>" --start-time <time> --end-time <time> --wait --vault <vault>`
  - `agent-cli collector run --table "<table_name>" --start-time <time> --end-time <time> [--pipeline "<pipeline_name>"] --wait --vault <vault>`
  - `agent-cli collector run --table "<table_name>" --records-file <json_path> --wait --vault <vault>`
  - `agent-cli collector status|logs|diagnose <event_trigger_id> --vault <vault>`
  - `agent-cli collector fix-plan <event_trigger_id> --output <plan_path> --vault <vault>`
  - `agent-cli collector apply-plan <plan_path> --yes --vault <vault>`
  - `agent-cli collector retry <event_trigger_id> --yes --wait --vault <vault>`
  - `agent-cli collector calls [--correlation-id <id>] [--limit N] --vault <vault>`

## Collector Operations and Safety

A model or table time-window trigger needs both times. A record trigger needs `--table` and a JSON object or non-empty array of objects. Without `--wait`, `run` returns after triggering; with it, the CLI waits for the finished event and adds a diagnosis. `logs` includes linked Pipeline logs by default (`--no-pipeline-logs` disables them; `--errors-only` filters them).

- `fix-plan` writes a reviewable JSON plan. `apply-plan --yes` validates its host, event ID, current diagnosis hash, and single eligible Pipeline retry before rerunning and waiting on the returned `traceId`.
- `retry --yes` creates a **new** Collector event. It blocks unfinished events, truncated execution evidence, events with any successful Pipeline execution (partial-success protection), and events where any task record lacks traceable `task.result.traceLinks`. Track the returned `newEventTriggerId`.
- `run --wait --auto-fix safe` only reruns a **unique failed Pipeline** with untruncated execution detail and complete `topicId`/`dataId`/`pipelineId` evidence when every diagnosed issue is `TRANSIENT_INFRASTRUCTURE`. Configuration and unknown errors remain `manualActions`; there is no general LLM automatic repair or configuration rewrite.
- `correlationId` groups CLI calls (`collector calls`), `eventTriggerId` identifies a Collector event, and `traceId` identifies a Pipeline execution. They are not interchangeable.

See `skills/agent-cli/references/collector-operations.md` for the full workflow. After operational recovery, use `agent-runtime-cli` for Metric/Ontology queries and eval; this CLI does not provide a unified Durable Runtime, Lambda support, or cross-resource atomic builds.

## How It Works with the Skill

Once the Skill is installed, compatible agents can automatically select the appropriate commands and resolve dependencies:

- When pulling a Pipeline, Topics are automatically fetched
- When pulling a Topic, factor `enumId` references are checked and Enums are fetched accordingly
- When pulling all (`--all` or `--target all`), the full dependency chain is synced: topic + pipeline + enum + semantic + metric + ingest_table + ingest_model + ingest_module

Skill definition:

- `packages/watchmen-agent-cli/skills/agent-cli/SKILL.md`

## Tips

- When creating a new Topic, use `kind: business` in most cases
- Always fill in `label` for each Factor using business-readable names
- Set `enumId` on any factor that references an enumeration
- Always pass `--vault` explicitly to avoid accidentally using the default path

## FAQ

- `agent-cli: command not found`
  - Run `poetry install` first
  - Use `poetry run agent-cli ...`
- No `poetry shell` under Poetry 2.x
  - Use `poetry run ...` directly instead
- CLI entry point error
  - Try `poetry run python -m agent_cli.main ...`
- Push new Topic returns 500
  - Use the no-id agent YAML view: omit `topicId` and `factorId`, keep business names, and do not invent `f-` placeholder IDs

## Development Layout

- CLI source: `packages/watchmen-agent-cli/src/agent_cli`
- Skill definition: `packages/watchmen-agent-cli/skills/agent-cli/SKILL.md`
