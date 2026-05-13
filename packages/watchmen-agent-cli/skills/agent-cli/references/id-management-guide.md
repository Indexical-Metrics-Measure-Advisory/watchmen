# ID Management Guide for All Watchmen Entities

## Problem

When creating new metadata entities (topics, pipelines, enums, semantic models, metrics, ingestion configs, etc.) with placeholder IDs (e.g., `f-xxx`, `1490...`, or any fake ID), the server returns:

```
ApiException: POST /<entity>/yaml failed with 500: {"detail":"Unpredicted exception occurred."}
```

Or validation errors:
```
ApiException: POST /pipeline/yaml failed with 400: validation error
```

## Root Cause

Watchmen server **cannot accept pre-assigned IDs** for new entities. All new entity IDs must be assigned by the server only.

## Solution: Use `null` for All IDs

### Rule of Thumb

```
┌─────────────────────────────────────────────────────────┐
│  NEW entities (to be created on server) → use null     │
│  EXISTING entities (already on server) → use real IDs  │
└─────────────────────────────────────────────────────────┘
```

---

## Supported Entities & ID Types

| Entity Type | Top-Level ID | Child IDs | Notes |
|------------|--------------|-----------|-------|
| **Topic** | `topicId` | `factorId` | factors array |
| **Pipeline** | `pipelineId` | `stageId`, `unitId`, `actionId` | stages > units > do |
| **Enum** | `enumId` | `itemId` | items array |
| **Semantic Model** | `modelId` | `metricId`, `dimensionId` | metricFlow semantic |
| **Metric** | `metricId` | - | MetricFlow metric |
| **Ingestion Table** | `configId` | - | ingest table config |
| **Ingestion Model** | `configId` | `tableConfigId` | contains tables array |
| **Ingestion Module** | `configId` | `modelConfigId` | contains models array |
| **DataSource** | `datasourceId` | - | system datasource |

---

## Topic YAML Template

```yaml
version: 1
createdAt: '2026-05-13T00:00:00'
createdBy: '1071081977535114240'
lastModifiedAt: '2026-05-13T00:00:00'
lastModifiedBy: '1071081977535114240'
tenantId: '1071081264281136128'
topicId: null                           # <-- MUST be null
name: my_new_topic
type: distinct
kind: business
factors:
- factorId: null                       # <-- MUST be null
  type: text
  name: field1
  label: Field 1
  description: My first field
  flatten: false
- factorId: null                       # <-- MUST be null
  type: number
  name: field2
  # ... more fields
```

---

## Pipeline YAML Template

```yaml
version: 1
createdAt: '2026-05-13T00:00:00'
createdBy: '1071081977535114240'
lastModifiedAt: '2026-05-13T00:00:00'
lastModifiedBy: '1071081977535114240'
tenantId: '1071081264281136128'
conditional: false
pipelineId: null                        # <-- MUST be null
topicId: '1083070031199647744'          # Source topic (real ID required)
name: pl_source_to_target
type: insert-or-merge
stages:
- conditional: false
  stageId: null                         # <-- MUST be null
  name: my_stage
  units:
  - conditional: false
    unitId: null                        # <-- MUST be null
    name: my_unit
    do:
    - actionId: null                    # <-- MUST be null
      type: insert-or-merge-row
      by:
        jointType: and
        filters:
        - left:
            kind: topic
            conditional: false
            topicId: '1083070031199647744'   # Source (real ID)
            factorId: '1083070031199647745'  # Source factor (real ID)
          operator: equals
          right:
            kind: topic
            conditional: false
            topicId: null               # <-- Fill after topic push
            factorId: null              # <-- Fill after topic pull
      mapping:
      - arithmetic: none
        source:
          kind: topic
          conditional: false
          topicId: '1083070031199647744'
          factorId: '1083070031199647745'
        factorId: null                  # <-- Fill after topic pull
      topicId: null                     # <-- Fill after topic push
      accumulateMode: standard
enabled: true
validated: false
```

---

## Enum YAML Template

```yaml
version: 1
createdAt: '2026-05-13T00:00:00'
createdBy: '1071081977535114240'
lastModifiedAt: '2026-05-13T00:00:00'
lastModifiedBy: '1071081977535114240'
tenantId: '1071081264281136128'
enumId: null                            # <-- MUST be null
name: MyEnum
description: My enumeration
items:
- itemId: null                          # <-- MUST be null
  code: CODE_1
  label: Code 1
- itemId: null                          # <-- MUST be null
  code: CODE_2
  label: Code 2
```

---

## Ingestion Table YAML Template

```yaml
version: 1
createdAt: '2026-05-13T00:00:00'
createdBy: '1071081977535114240'
lastModifiedAt: '2026-05-13T00:00:00'
lastModifiedBy: '1071081977535114240'
tenantId: '1071081264281136128'
configId: null                          # <-- MUST be null
name: my_table
type: table
# ... table config fields
```

---

## Ingestion Model YAML Template

```yaml
version: 1
createdAt: '2026-05-13T00:00:00'
createdBy: '1071081977535114240'
lastModifiedAt: '2026-05-13T00:00:00'
lastModifiedBy: '1071081977535114240'
tenantId: '1071081264281136128'
configId: null                          # <-- MUST be null
name: my_model
type: model
tables:
- configId: null                        # <-- MUST be null
  name: RootTable
  parentName: null                      # Root table has no parent
  # ... table fields
- configId: null                        # <-- MUST be null
  name: ChildTable
  parentName: RootTable                  # References parent table
  # ... table fields
```

---

## Ingestion Module YAML Template

```yaml
version: 1
createdAt: '2026-05-13T00:00:00'
createdBy: '1071081977535114240'
lastModifiedAt: '2026-05-13T00:00:00'
lastModifiedBy: '1071081977535114240'
tenantId: '1071081264281136128'
configId: null                          # <-- MUST be null
name: my_module
type: module
models:
- configId: null                        # <-- MUST be null
  name: model1
  # ... model config
```

---

## Semantic Model YAML Template

```yaml
version: 1
createdAt: '2026-05-13T00:00:00'
createdBy: '1071081977535114240'
lastModifiedAt: '2026-05-13T00:00:00'
lastModifiedBy: '1071081977535114240'
tenantId: '1071081264281136128'
modelId: null                           # <-- MUST be null
name: my_semantic_model
# ... semantic model fields
```

---

## Metric YAML Template

```yaml
version: 1
createdAt: '2026-05-13T00:00:00'
createdBy: '1071081977535114240'
lastModifiedAt: '2026-05-13T00:00:00'
lastModifiedBy: '1071081977535114240'
tenantId: '1071081264281136128'
metricId: null                           # <-- MUST be null
name: my_metric
# ... metric fields
```

---

## DataSource YAML Template

```yaml
version: 1
createdAt: '2026-05-13T00:00:00'
createdBy: '1071081977535114240'
lastModifiedAt: '2026-05-13T00:00:00'
lastModifiedBy: '1071081977535114240'
tenantId: '1071081264281136128'
datasourceId: null                      # <-- MUST be null
name: my_datasource
type: MYSQL
# ... datasource config
```

---

## Workflow: Creating New Topic + Pipeline

### Step 1: Create Topic YAML with `null` IDs

```yaml
# transformation/topics/my_topic__new.yml
topicId: null
name: my_topic
type: distinct
kind: business
factors:
- factorId: null
  type: text
  name: field1
  # ...
```

### Step 2: Push Topic to Server

```bash
agent-cli topic push-file transformation/topics/my_topic__new.yml --vault <vault>
```

**Response:**
```json
{
  "status": "pushed",
  "topicId": "1504225603996594176",
  "replaced": false
}
```

### Step 3: Pull Topic to Get Server-Assigned Factor IDs

```bash
agent-cli topic pull 1504225603996594176 --vault <vault>
```

### Step 4: Read Pulled Topic to Get Real Factor IDs

```bash
cat transformation/topics/my_topic__1504225603996594176.yml
```

```yaml
topicId: '1504225603996594176'
factors:
- factorId: '1504225603996594177'      # Server-assigned!
  name: field1
- factorId: '1504225603996594178'      # Server-assigned!
  name: field2
```

### Step 5: Create Pipeline Using Real Factor IDs

```yaml
pipelineId: null
topicId: '1083070031199647744'          # Source (real ID)
target:
  topicId: '1504225603996594176'         # From Step 3
  factorId: '1504225603996594177'        # From Step 4
```

### Step 6: Push Pipeline

```bash
agent-cli pipeline push-file transformation/pipelines/pl_xxx__new.yml --vault <vault>
```

---

## Workflow: Creating New Enum

### Step 1: Create Enum YAML

```yaml
enumId: null
name: MyEnum
items:
- itemId: null
  code: A
  label: Option A
```

### Step 2: Push Enum

```bash
agent-cli enum push-file transformation/enums/my_enum__new.yml --vault <vault>
```

### Step 3: Pull Enum to Get Server-Assigned IDs

```bash
agent-cli enum pull <returned_enum_id> --vault <vault>
```

---

## Workflow: Creating Ingestion Model

### Step 1: Create Model YAML (all IDs null)

```yaml
configId: null
name: my_model
tables:
- configId: null
  name: root_table
  parentName: null
- configId: null
  name: child_table
  parentName: root_table
```

### Step 2: Push Model

```bash
agent-cli ingest model push-file transformation/ingest/models/my_model__new.yml --vault <vault>
```

### Step 3: Pull Model to Get Server-Assigned IDs

```bash
agent-cli ingest model pull my_model --vault <vault>
```

### Step 4: If Needed, Create Raw Topic from Model

```bash
agent-cli ingest model create-raw-topic my_model --vault <vault>
```

---

## Quick Reference Table

| Entity | ID Field | Child IDs | Command |
|--------|----------|-----------|---------|
| Topic | `topicId: null` | `factorId: null` | `topic push-file` |
| Pipeline | `pipelineId: null` | `stageId/unitId/actionId: null` | `pipeline push-file` |
| Enum | `enumId: null` | `itemId: null` | `enum push-file` |
| Semantic | `modelId: null` | - | `semantic push-file` |
| Metric | `metricId: null` | - | `metric push-file` |
| Ingest Table | `configId: null` | - | `ingest table push-file` |
| Ingest Model | `configId: null` | `tableConfigId: null` | `ingest model push-file` |
| Ingest Module | `configId: null` | `modelConfigId: null` | `ingest module push-file` |
| DataSource | `datasourceId: null` | - | `datasource push-file` |

---

## Common Mistakes

### ❌ Wrong: Fake IDs

```yaml
topicId: 'f-123456'
factorId: 'f-123456-1'
pipelineId: '1490000000000000101'
```

### ❌ Wrong: Placeholder IDs

```yaml
topicId: '1490000000000000001'
factorId: '1490000000000000002'
```

### ✅ Correct: All Null

```yaml
topicId: null
factorId: null
pipelineId: null
```

---

## File Naming Convention

After server push, rename files using real IDs:

```
Before: my_entity__new.yml              # placeholder
After:  my_entity__1504225603996594176.yml  # real ID
```

---

## Key Takeaways

1. **NEW entity** → `id: null`
2. **PUSH** → Server returns real ID
3. **PULL** → Get server-assigned child IDs
4. **UPDATE related files** → Use real IDs from server
5. **Never use fake/placeholder IDs** → Always use `null`

---

*Last Updated: 2026-05-13*