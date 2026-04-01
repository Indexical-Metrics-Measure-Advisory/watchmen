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

## Topic push returns 500 on create
- Use fake IDs (`f-` prefix) or blank IDs for new Topic/Factor so server can redress IDs.
