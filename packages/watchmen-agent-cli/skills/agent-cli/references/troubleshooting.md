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

## Pipeline push failed: Column 'topic_id' cannot be null
   - Symptom: Server returns `(1048, "Column 'topic_id' cannot be null")` when pushing a Pipeline YAML.
   - Cause: Pipeline YAML is missing the `topicId` field at the **root level**, which the server uses to link the pipeline to its source topic.
   - **CRITICAL**: The `topicId` field MUST be at the root level of the YAML (same level as `name`, `type`, `tenantId`, etc.), NOT inside `stages`.
   - Fix:
     - Add `topicId` at the root level pointing to the **source topic** (not target topic).
     - Example correct structure:
       ```yaml
       version: 1
       createdAt: '2026-05-15T16:45:00'
       createdBy: '1486435408748227584'
       tenantId: '1486434545505938432'
       # topicId MUST be at root level (source topic)
       topicId: '1504877556737592320'
       name: ETL CRM Customer to Customer
       type: insert-or-merge
       enabled: true
       sourceTopicId: '1504877556737592320'   # source topic id
       targetTopicId: '1504879695669054464'  # target topic id
       stages:
         - stageId: etl-customer-s-1
           name: ETL Stage 1
           units:
             - unitId: etl-u-1
               name: ETL Unit 1
               do:
                 - actionId: etl-a-1
                   type: insert-row
                   topicId: '1504879695669054464'  # target topic id
                   accumulateMode: standard
                   mapping:
                     - source:
                         kind: topic
                         topicId: '1504877556737592320'  # source topic id
                         factorId: 'source_factor_id'
                       factorId: 'target_factor_id'
       ```

## Pipeline push creates duplicate instead of updating existing
   - Symptom: After pushing a pipeline update, a new pipeline is created instead of updating the existing one.
   - Cause: When pushing a modified pipeline, the YAML is missing the `pipelineId` field, so the server treats it as a new pipeline.
   - Fix:
     - When updating an existing pipeline, **keep the `pipelineId` field** in the YAML.
     - The YAML structure should include `pipelineId` at root level to trigger an update:
       ```yaml
       version: 1
       createdAt: '2026-05-15T16:45:00'
       createdBy: '1486435408748227584'
       lastModifiedAt: '2026-05-15T16:50:00'
       lastModifiedBy: '1486435408748227584'
       tenantId: '1486434545505938432'
       pipelineId: '1504880793700092928'   # MUST exist to update
       topicId: '1504877556737592320'      # source topic
       name: ETL CRM Customer to Customer
       type: insert-or-merge
       enabled: true
       ...
       ```
   - If duplicate pipelines exist, they must be manually deleted via the Watchmen UI (no CLI delete command available).

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


