---
name: agent-cli
description: Synchronizes Watchmen metadata (topic/pipeline/enum/semantic/metric/ingest) via CLI+REST. Invoke for init, pull/push, list-remote, pull by name/id, and YAML sync.
---

# Agent CLI for Watchmen

This skill is a thin orchestration layer for `agent-cli`.
Keep this file concise and load detailed references only when needed.

## Skill Layout
- `SKILL.md`: invocation rules and execution flow.
- `references/`: command catalog, dependency model, troubleshooting, source-of-truth notes.
- `assets/`: reusable templates and examples.

## When To Invoke
- User asks to initialize CLI vault/config.
- User asks to pull/push Topic, Pipeline, Enum, Semantic Model, Metric, or Ingestion configs.
- User asks to list remote metadata.
- User asks to pull by name/id, or push local YAML files.

## Pre-Execution Checklist
1. Ensure CLI is installed:
   - `cd packages/watchmen-agent-cli && poetry install`
2. Ensure vault config exists (`init` first if missing):
   - `agent-cli init --vault <vault> --host <host> --pat <token>`
3. Prefer module entrypoint for compatibility:
   - `poetry run python -m agent_cli ...`
4. For names containing spaces, enforce quotes:
   - `"Policy Admin System"`

## Token Optimization Rules
- **Precise YAML Reading**: For files > 50 lines, NEVER use full-file `Read`. Use `Grep` to locate keys (e.g., factor names) and `Read` with `offset/limit` to fetch specific chunks.
- **Incremental Edits**: Always prefer `SearchReplace` over `Write` for large YAMLs to minimize the data sent in the diff.
- **Discovery First**: Use `agent-cli topic list-remote` to find IDs/names instead of pulling all files.
- **Context Management**: Once a metadata ID is found, store it in your internal thought process and avoid re-querying or re-reading the source.

## On-Demand Loading Rules
- Load `references/command-catalog.md` when deciding exact command/args.
- Load `references/dependency-chain.md` when deciding related entities to sync.
- Load `references/troubleshooting.md` when command fails.
- Load `references/source-of-truth.md` when generating or validating YAML/JSON payloads.
- Load `references/pipeline-development.md` when user asks to build/modify pipeline logic.
- Load `assets/templates/` only when user asks to generate starter content.

## Default Execution Flow
1. Identify user intent and entity type.
2. Load minimal required reference file(s).
3. Resolve prerequisites (`--vault`, auth, host).
4. Execute smallest safe command.
5. Return structured JSON result summary.
6. If failure occurs, load troubleshooting reference and retry with fix.

## Scope
- Supported entities: Topic, Pipeline, Enum, MetricFlow Semantic Model, MetricFlow Metric, Ingestion Module/Model/Table.
- Protocol: YAML for topic/pipeline/enum/ingestion.
- Outputs: JSON summaries suitable for agent chaining.
