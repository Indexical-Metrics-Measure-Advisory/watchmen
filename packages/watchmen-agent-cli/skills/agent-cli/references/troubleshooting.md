# Troubleshooting

## `agent-cli: command not found`
- Install package:
  - Global: `pip install watchmen-agent-cli`
  - Local Dev: `poetry install`

## `No such command 'ingest'`
- Reinstall latest package and use module entrypoint:
  - `poetry install`
  - `poetry run python -m agent_cli ingest ...`

## Vault config missing
- Initialize first:
  - `agent-cli init --vault <vault> --host <host> --pat <token>`

## Names with spaces cause extra arguments
- Wrap names with quotes:
  - `agent-cli ingest module pull "Policy Admin System" --vault myvault`

## Ingest table push failed: model must have only one root table
- Symptom: Server returns error when pushing an ingest table YAML.
- Cause: In a single model, more than one table is configured as a root table (no `parentName`).
- Rule: **One model can only have exactly one root table** — all other tables must specify `parentName` to establish a parent-child hierarchy.
- Fix:
  - Ensure only **one** table in the model has no `parentName` field (or `parentName` is empty/null).
  - All other tables must set `parentName` to reference their parent table's `name`.
  - Example (correct hierarchy):
    ```yaml
    # Root table — no parentName
    - configId: f-table_customer_001
      name: Customer
      parentName: null   # or simply omit parentName

    # Child table — must reference parent
    - configId: f-table_order_001
      name: CustomerOrder
      parentName: Customer

    # Grandchild table
    - configId: f-table_order_item_001
      name: OrderItem
      parentName: CustomerOrder
    ```

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


