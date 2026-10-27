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

## Pipeline push failed: missing source Topic or duplicate Pipeline
- Agent Pipeline YAML uses root `sourceTopicName`, not `topicId` or `sourceTopicId`. The source Topic must already exist and the name must match exactly.
- Updates are resolved by `pipeline.name`; keep the existing name and do not add `pipelineId`.
- Do not reintroduce `stageId`, `unitId`, `actionId`, `topicId`, or `factorId` to fix a push error. Use `topicName` and `factorName` references instead.
- Check remote names with `agent-cli pipeline list-remote --vault <vault>` before pushing. If duplicates already exist, remove them through the Watchmen UI; there is no CLI delete command.

## Collector run arguments are rejected
Use exactly one input form:
- Model: `--model <name> --start-time <time> --end-time <time>`.
- Table time window: `--table <name> --start-time <time> --end-time <time>`; optionally add `--pipeline <name>`.
- Records: `--table <name> --records-file <path>` with a JSON object or non-empty array of objects.
Model and Pipeline names must each match exactly one remote resource. Do not combine model, table records, and time-window forms.

## Collector wait times out
The event or Pipeline may still be running. Do not immediately retry it. Re-run `collector status <event_trigger_id>` or `collector diagnose <event_trigger_id>`, and inspect `collector logs <event_trigger_id>` when needed.

## Collector failure has no actionable details
`manualActions` intentionally directs inspection of Collector task history and server logs when failure evidence is unavailable. Missing logs or an `UNKNOWN` category are not evidence that automatic repair is safe.

## Safe auto-fix stops without changes
For `run --auto-fix safe`, all of the following must hold: exactly one failed Pipeline, complete `topicId`/`dataId`/`pipelineId` rerun evidence, and an issue category set of exactly `TRANSIENT_INFRASTRUCTURE`. Configuration, authentication, permission, metadata, conversion, and unknown errors stay in `manualActions`. A failed automatic rerun also stops further attempts.

## Fix plan cannot be applied
- `apply-plan` requires `--yes`.
- Regenerate the plan if its host or event differs from the current vault/diagnosis, or if `diagnosisHash` is stale.
- The plan must contain exactly one eligible `retry_pipeline` action. A `manual_review` action cannot be applied.
- A rerun response without `traceId` is not a successful recovery; inspect the server response and Pipeline logs.

## Event retry is blocked
`collector retry` requires `--yes` and a finished `FAILED`/`PARTIAL` event. It refuses to retry when any successful Pipeline execution exists (partial-success protection), or when task records exist without `task.result.traceLinks` (untraceable-task protection). Inspect the successful work or task history instead of forcing a duplicate event. A successful retry returns `newEventTriggerId`; track that new ID with `status`/`diagnose`, optionally using retry `--wait`.

## Finding related Collector calls
Use `collector calls --correlation-id <id> --vault <vault>` for the local CLI ledger. `correlationId` groups calls; it is not an `eventTriggerId` (Collector event) or `traceId` (Pipeline execution). See `references/collector-operations.md`.

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


