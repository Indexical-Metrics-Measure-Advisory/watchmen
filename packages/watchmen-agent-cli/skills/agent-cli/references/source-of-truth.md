# Source of Truth

## Topic
- `packages/watchmen-model/src/watchmen_model/admin/topic.py`
- Prefer `kind: business` for newly created topics.
- Ensure each factor has a business-friendly `label`.
- Use `enumId` when factor value comes from enum code table.

## Pipeline
- `packages/watchmen-model/src/watchmen_model/admin/pipeline.py`
- Trigger types: `insert`, `merge`, `insert-or-merge`, `delete`.
- Structure: `stages[] -> units[] -> do[]`.
- Current CLI pipeline sync uses JSON import endpoints.

## Ingestion
- Module model:
  - `packages/watchmen-collector-kernel/src/watchmen_collector_kernel/model/collector_module_config.py`
- Model config:
  - `packages/watchmen-collector-kernel/src/watchmen_collector_kernel/model/collector_model_config.py`
- Table config:
  - `packages/watchmen-collector-kernel/src/watchmen_collector_kernel/model/collector_table_config.py`
