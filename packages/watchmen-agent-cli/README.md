# Watchmen Agent CLI

Watchmen Agent CLI is a tool for syncing Topics, Pipelines, and Enums between a **local vault** and the **Watchmen server**. It is designed for daily data development, configuration migration, and AI-assisted automation workflows.

It also ships with a Trae Skill (`agent-cli`) that lets AI directly perform pull, push, dependency sync, and remote listing operations within a conversation.

## Core Capabilities

- Topic YAML sync (pull by ID/name, push single file, batch push/pull)
- Pipeline JSON sync (pull by ID/name, batch push/pull)
- Enum codebook sync (pull by ID/name, push single file, remote listing)
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

It is recommended to install the Skill (callable directly from within Trae):

```bash
./scripts/install-skill.sh
```

## Quick Start

1. Initialize the vault and configuration

```bash
poetry run agent-cli init --vault ./my_vault --host <WATCHMEN_HOST> --pat <YOUR_PAT>
```

1. Pull all resources (Topic + Pipeline + Enum)

```bash
poetry run agent-cli pull --target all --vault ./my_vault
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
  - `agent-cli pull --target topic|pipeline|all --vault <vault>`
  - `agent-cli push --target topic|pipeline|all --vault <vault>`
- Topic
  - `agent-cli topic pull <topic_id> --vault <vault>`
  - `agent-cli topic pull-name "<topic_name>" --vault <vault>`
  - `agent-cli topic push-file <file_path> --vault <vault>`
  - `agent-cli topic list --vault <vault>`
  - `agent-cli topic list-remote --vault <vault>`
- Pipeline
  - `agent-cli pipeline pull <pipeline_id> --vault <vault>`
  - `agent-cli pipeline pull-name "<pipeline_name>" --vault <vault>`
  - `agent-cli pipeline list --vault <vault>`
  - `agent-cli pipeline list-remote --vault <vault>`
- Enum
  - `agent-cli enum pull <enum_id> --vault <vault>`
  - `agent-cli enum pull-name "<enum_name>" --vault <vault>`
  - `agent-cli enum push-file <file_path> --vault <vault>`
  - `agent-cli enum list --vault <vault>`
  - `agent-cli enum list-remote --vault <vault>`

## How It Works with the Skill

Once the Skill is installed, the AI in Trae will automatically select the appropriate commands and resolve dependencies:

- When pulling a Pipeline, Topics are automatically fetched
- When pulling a Topic, factor `enumId` references are checked and Enums are fetched accordingly
- When pulling all, the full dependency chain is synced

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
  - Use a fake id (`f-` prefix) or an empty id for new Topics/Factors to let the server regenerate them

## Development Layout

- CLI source: `packages/watchmen-agent-cli/src/agent_cli`
- Skill definition: `packages/watchmen-agent-cli/skills/agent-cli/SKILL.md`

