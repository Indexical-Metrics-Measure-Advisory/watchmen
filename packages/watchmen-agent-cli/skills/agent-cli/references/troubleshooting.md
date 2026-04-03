# Troubleshooting

## `agent-cli: command not found`
- Install package:
  - `cd packages/watchmen-agent-cli && poetry install`

## `No such command 'ingest'`
- Reinstall latest package and use module entrypoint:
  - `cd packages/watchmen-agent-cli && poetry install`
  - `poetry run python -m agent_cli ingest ...`

## Vault config missing
- Initialize first:
  - `agent-cli init --vault <vault> --host <host> --pat <token>`

## Names with spaces cause extra arguments
- Wrap names with quotes:
  - `agent-cli ingest module pull "Policy Admin System" --vault myvault`

## PAT can list but cannot push
- Verify tenant and permission:
  - `agent-cli tenant --vault <vault>`
- Ensure local YAML `tenantId` matches PAT tenant.

## Context limit reached or Token usage high
- Symptoms: `Token limit exceeded` or `Context too large` in conversation.
- Fix:
  - DO NOT read full topic YAML files if they are > 50 lines.
  - Use `Grep` to locate only the necessary factor/pipeline action block.
  - Use `Read` with `offset` and `limit` to fetch just that block.
  - Avoid bulk `pull` or `list` if you already have the target ID/name.
  - Use `SearchReplace` to modify only the target block.
