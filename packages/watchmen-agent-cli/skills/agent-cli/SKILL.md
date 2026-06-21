---
name: agent-cli
description: Synchronizes Watchmen metadata (topic/pipeline/enum/semantic/metric/ingest) via CLI+REST. Invoke for init, pull/push, list-remote, pull by name/id, and YAML sync.
---

# Agent CLI for Watchmen

Thin orchestration layer for `agent-cli`. Keep this file concise; load detailed references only when needed.

## Skill Layout

- `SKILL.md`: invocation rules and execution flow.
- `references/`: command catalog, dependency model, troubleshooting, source-of-truth notes.
- `assets/`: reusable templates and examples.

## When To Invoke

- User asks to initialize CLI vault/config.
- User asks to pull/push Topic, Pipeline, Enum, Semantic Model, Metric, or Ingestion configs.
- User asks to list remote metadata or pull data sources.
- User asks to pull by name/id, or push local YAML files.
- User asks to create a raw topic from a collector model (generate Topic YAML from Ingestion model).

## Critical Rules

- **Check Before Create**: Before creating any entity (Topic, Pipeline, Enum, Semantic Model, Metric, Ingestion), first check the local filesystem for existing YAML files, then run `list-remote` to check remote. If it exists, UPDATE instead of creating a duplicate. → `references/pre-submission-validation.md`
- **Topic/Pipeline Agent YAML**: Topic and Pipeline YAML are now no-id agent views. Do NOT include `topicId`, `factorId`, `pipelineId`, `stageId`, `unitId`, `actionId`, `tenantId`, or `version`. Use `name` as the local file index. → `references/source-of-truth.md`
- **Topic datasource**: use `dataSourceCode` (not `dataSourceId`) in topic YAML. If unknown, run `datasource list-remote` or ASK the user. → `references/source-of-truth.md`
- **Pipeline references**: use `sourceTopicName`, `topicName`, and `factorName` instead of `topicId` / `factorId`. → `references/pipeline-development.md`
- **IDs**: For Topic/Pipeline, omit IDs entirely. For legacy entities (Enum/Semantic/Metric/Ingestion), new IDs still use `null`. → `references/id-management-guide.md`
- **Validation**: Run all pre-submission checks before pushing any YAML. → `references/pre-submission-validation.md`
- **Data Layers**: Four-layer architecture (Bronze→Silver→Gold→Datamart). → `references/data-layer-architecture.md`

## Install CLI and Init

1. Ensure CLI is installed → `references/cli-install-guide.md`
2. Ensure vault config exists: `agent-cli init --vault <vault> --host <host> --pat <token>`
3. Prefer module entrypoint: `poetry run python -m agent_cli ...`
4. Quote names with spaces: `"Policy Admin System"`

## File Naming Conventions

- Topic/Pipeline local files: `{name}.yml` (no ID suffix).
- Other legacy entities still use `{name}__{id}.yml` unless their reference says otherwise.
- Directory layout → `references/source-of-truth.md`

## Token Optimization Rules

- **Precise YAML Reading**: For files > 50 lines, use `Grep` to locate keys and `Read` with `offset/limit`.
- **Incremental Edits**: Prefer `SearchReplace` over `Write` for large YAMLs.
- **Discovery First**: Use `list-remote` to find IDs/names instead of pulling all files.
- **Context Management**: Once an ID is found, store it and avoid re-querying.

## On-Demand Loading Rules

- Load `references/command-catalog.md` when deciding exact command/args.
- Load `references/dependency-chain.md` when deciding related entities to sync.
- Load `references/troubleshooting.md` when command fails.
- Load `references/source-of-truth.md` when generating or validating YAML/JSON payloads.
- Load `references/pipeline-development.md` when user asks to build/modify pipeline logic.
- Load `references/pre-submission-validation.md` before pushing any topic or pipeline YAML.
- Load `references/id-management-guide.md` when creating new entities with IDs.
- Load `references/data-layer-architecture.md` when user asks about data layer design or topic naming by layer.
- Load `assets/templates/` only when user asks to generate starter content.

## Default Execution Flow

1. Identify user intent and entity type.
2. **Check remote** for existing entities with the same name (`list-remote`) before creating anything new.
3. Load minimal required reference file(s).
4. Resolve prerequisites (`--vault`, auth, host).
5. Execute smallest safe command.
6. Return structured JSON result summary.
7. If failure occurs, load troubleshooting reference and retry with fix.

## Scope

- Supported entities: Topic, Pipeline, Enum, MetricFlow Semantic Model, MetricFlow Metric, Ingestion Module/Model/Table, DataSource.
- Supported actions: pull, push, list, list-remote, pull by name/id, push local YAML files, create raw topic from ingestion model.
- Protocol: YAML for topic/pipeline/enum/ingestion.
- Outputs: JSON summaries suitable for agent chaining.
