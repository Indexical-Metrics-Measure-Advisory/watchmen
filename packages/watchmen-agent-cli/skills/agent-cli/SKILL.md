---
name: agent-cli
description: Synchronizes Topics/Pipelines with Watchmen via REST (YAML/JSON). Invoke when user requests init, pull/push, list remote, or pull by id/name.
---

# Agent CLI for Watchmen

This skill exposes the Watchmen Agent CLI to synchronize Topics and Pipelines between a local vault and a Watchmen server via REST. It supports YAML-based Topic CRUD and JSON-based Pipeline import, and returns structured outputs suitable for AI workflows.

## What It Does
- Initializes local vault and connection config (host, username, password, PAT).
- Pulls data from server to local (topics as YAML, pipelines as JSON).
- Pushes local changes to server (topic YAML files, legacy JSON imports).
- Lists local files and server-side resources for discovery.
- Fine-grained operations: pull by ID or by name; push single topic YAML file.

## When To Invoke
- User asks to sync local files ↔ server data.
- User wants to list server topics/pipelines.
- User requests pull by topic/pipeline name or id.
- User provides/edits a local topic YAML and wants to push.
- User asks to initialize or inspect CLI configuration.

## Prerequisites
- The CLI is installed and runnable (e.g., via Poetry or a built wheel/binary).
  - **If not installed locally:** Run `cd packages/agent-cli && poetry install` to install the agent-cli package.
- Server base URL and credentials are known.
- Recommended: run `init` first to create the vault and config.

## Execution Conditions (Before Invoking This Skill)
- Check if `agent-cli` is installed locally. If not (e.g., command not found), run `cd packages/agent-cli && poetry install` to install it.
- Users must provide key parameters for `init`: `--host` and `--pat` (and optionally `--vault`).
- If the above information is missing, ask the user to provide it before executing any `init`, `pull`, `push`, or `list` commands.

## Supported Commands
- `init` — Initialize vault and config
  - Args: `--vault`, `--host`, `--username`, `--password`, `--pat`
- `pull` — Bulk pull from server
  - Args: `--target` (topic|pipeline|all), `--vault`
- `push` — Bulk push local changes to server
  - Args: `--target` (topic|pipeline|all), `--vault`
- `topic pull` — Pull a topic by ID
  - Args: `topic_id`, `--vault`
- `topic pull-name` — Pull a topic by name
  - Args: `topic_name`, `--vault`
- `topic push-file` — Push a single topic YAML file
  - Args: `file_path`, `--vault`
- `topic list` — List local topic files
  - Args: `--vault`
- `topic list-remote` — List topics from server
  - Args: `--vault`
- `pipeline pull` — Pull a pipeline by ID
  - Args: `pipeline_id`, `--vault`
- `pipeline pull-name` — Pull pipelines by name
  - Args: `pipeline_name`, `--vault`
- `pipeline list` — List local pipeline files
  - Args: `--vault`
- `pipeline list-remote` — List pipelines from server
  - Args: `--vault`
- `tenant` — Resolve tenant information from current PAT
  - Args: `--vault`
- `config` — Show current configuration
  - Args: `--vault`
- `discover` — Output a list of discoverable commands

## Usage Guidance
- Always include `--vault` unless the default is set via environment variable.
- For `--host`, the CLI auto-prefixes `http://` when missing.
- Topic sync uses YAML endpoints; pipeline sync uses JSON import endpoints.
- Outputs are JSON and suitable for downstream processing by agents.
- If you’re not sure which command to use, run `agent-cli --help` (or `agent-cli <command> --help`) to see available commands and arguments.
- In general, newly created topics should use `kind: business`.
- Use `kind: system` only for explicit technical/system integration scenarios.
- When creating Topic factors, always set `label` for each factor.
- Labels should be business-optimized, human-readable names (not technical column names), suitable for business users to understand directly.
- Recommended label style: concise business phrase, consistent terminology, and clear domain meaning (for example, `customer_id` → `Customer ID`, `total_premium_sum` → `Total Premium Amount`).

## Examples
- Initialize:
  - `agent-cli init --vault myvault --host http://localhost:8000 --pat <TOKEN>`
- Pull by name:
  - `agent-cli topic pull-name "quotation_main" --vault myvault`
  - `agent-cli pipeline pull-name "pl_source_insurance_quotation_raw_to_quotation_main" --vault myvault`
- List from server:
  - `agent-cli topic list-remote --vault myvault`
  - `agent-cli pipeline list-remote --vault myvault`
- Resolve tenant from PAT:
  - `agent-cli tenant --vault myvault`
- Push a topic YAML:
  - `agent-cli topic push-file myvault/topics/quotation_main__<id>.yml --vault myvault`

## Pipeline Development
- Concepts:
  - Pipelines process events from a source topic (`topicId`) and write to target topics via actions.
  - Structure: `stages[]` → `units[]` → `do[]` actions. Each level supports optional `conditional` and `on` filters.
  - Common pipeline `type`: `insert`, `merge`, etc. Set `enabled: true` to activate.
- Actions (commonly used):
  - `insert-row`: Insert a row into a target topic. Supports field-by-field `mapping`.
  - `merge-row`: Upsert into a target topic with keys. Mapping similar to insert with extra merge keys.
- Mapping Schema (for `insert-row`):
  - `mapping[]`: Each item describes one target factor assignment:
    - `arithmetic`: `none` (or math ops when needed)
    - `source`: defines data origin, e.g. `{ kind: "topic", topicId: "<source_topic>", factorId: "<factor>" }`
    - `factorId`: target topic factor id/name (depending on schema)
  - `accumulateMode`: `"standard"` for typical write behavior
- Minimal Example

```json
{
  "type": "insert",
  "stages": [
    {
      "units": [
        {
          "do": [
            {
              "type": "insert-row",
              "mapping": [
                {
                  "arithmetic": "none",
                  "source": { "kind": "topic", "topicId": "source_insurance_quotation_raw", "factorId": "quotation_no" },
                  "factorId": "quotation_no"
                }
              ],
              "topicId": "quotation_main",
              "accumulateMode": "standard"
            }
          ]
        }
      ]
    }
  ],
  "enabled": true
}
```

- Development Workflow with CLI:
  - Pull reference pipelines for context:
    - `agent-cli pipeline pull-name "<name>" --vault myvault`
    - `agent-cli pipeline list-remote --vault myvault`
  - Edit local JSON under `myvault/pipelines/`.
  - Push updated pipelines:
    - `agent-cli push --target pipeline --vault myvault`
- Validation & Best Practices:
  - Ensure target topic and factor names/ids exist.
  - Keep `name` unique and descriptive; align with source/target topics.
  - Prefer explicit mappings; avoid implicit behavior.
  - Start with `enabled: false` during drafting when necessary, switch to `true` after testing.
- Notes:
  - Current CLI uses JSON import endpoints for pipelines.
  - YAML endpoints for pipelines can be added similarly to topics in future iterations if needed.

## Source/Target Topic Conversion Scenario
**Scenario Goal**: Generate or modify a pipeline based on a source topic and a user-provided target topic markdown.
**Workflow**:
1. **Source Topic**: The user provides a source topic (either as a local YAML file or by asking you to pull it from the server using `agent-cli topic pull-name`).
2. **Target Topic**: The user provides the target topic schema as Markdown text.
3. **Transformation Logic**: Analyze the source topic fields (YAML) and the target topic fields (Markdown). Determine the mapping and transformation rules (e.g., field renaming, type conversion, basic arithmetic).
4. **Generate/Modify Pipeline**: Write or update the pipeline JSON file locally (in `myvault/pipelines/`) implementing the transformation logic (typically using an `insert-row` or `merge-row` action).
5. **Push Pipeline**: Use `agent-cli push --target pipeline --vault <vault>` to upload the generated/modified pipeline to the Watchmen server.

## Known Issues and Fixes
- **Issue: `agent-cli: command not found`**
  - **Fix**: Ensure the CLI is installed. Run `cd packages/agent-cli && poetry install`. Then try running it with `poetry run agent-cli ...` or `poetry run python -m agent_cli.main ...`.
- **Issue: `poetry shell` not available in Poetry 2.x**
  - **Fix**: Use `poetry run ...` for commands, or activate the virtual environment directly.
- **Issue: `agent-cli ...` entrypoint prints `'format'`**
  - **Fix**: Use `poetry run python -m agent_cli.main ...` as a reliable execution path.
- **Issue: Vault config not found**
  - **Fix**: Run `agent-cli init --vault <vault> --host <host> --pat <token>` before pull/push/list operations.
- **Issue: Topic push returns 500 when creating a new topic**
  - **Fix**: For new topic creation, use fake IDs (`topicId` and `factorId` starting with `f-`) or blank IDs so the server can redress to real IDs.
- **Issue: Need year/month aggregation from datetime**
  - **Fix**: In pipeline mapping/by filters, use computed parameters with `type: "year-of"` and `type: "month-of"` to map datetime into separate numeric dimensions.
- **Issue: PAT can list but cannot push**
  - **Fix**: Use `agent-cli tenant --vault <vault>` to confirm PAT tenant. Ensure local YAML `tenantId` matches PAT tenant, and PAT has admin write permission for that tenant.
