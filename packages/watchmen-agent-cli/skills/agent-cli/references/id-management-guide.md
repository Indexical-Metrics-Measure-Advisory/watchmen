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

## Solution: Use Agent No-ID YAML for Topic/Pipeline

### Rule of Thumb

```text
Topic/Pipeline local YAML → omit internal IDs entirely; server upserts by name.
Legacy entities → new IDs use null, existing IDs use real server IDs.
```

Topic/Pipeline are special now: do not write `topicId`, `factorId`, `pipelineId`, `stageId`, `unitId`, `actionId`, `tenantId`, or `version` in local YAML.

---

## Supported Entities & ID Types

| Entity Type          | Top-Level ID          | Child IDs                 | Notes                                         |
| -------------------- | --------------------- | ------------------------- | --------------------------------------------- |
| **Topic**            | omitted in agent YAML | omitted in agent YAML     | server resolves by topic/factor name          |
| **Pipeline**         | omitted in agent YAML | omitted in agent YAML     | server resolves by pipeline/topic/factor name |
| **Enum**             | `enumId`              | `itemId`                  | items array                                   |
| **Semantic Model**   | `modelId`             | `metricId`, `dimensionId` | metricFlow semantic                           |
| **Metric**           | `metricId`            | -                         | MetricFlow metric                             |
| **Ingestion Table**  | `configId`            | -                         | ingest table config                           |
| **Ingestion Model**  | `configId`            | `tableConfigId`           | contains tables array                         |
| **Ingestion Module** | `configId`            | `modelConfigId`           | contains models array                         |
| **DataSource**       | `datasourceId`        | -                         | system datasource                             |

---

## Topic YAML Template (Agent No-ID)

```yaml
name: my_new_topic
type: distinct
kind: business
dataSourceCode: default
description: My topic
factors:
    - name: field1
      type: text
      label: Field 1
      description: My first field
      flatten: false
    - name: field2
      type: number
      label: Field 2
```

Do not include `topicId`, `factorId`, `tenantId`, or `version`.

---

## Pipeline YAML Template (Agent No-ID)

```yaml
name: pl_source_to_target
sourceTopicName: raw_source_topic
type: insert-or-merge
enabled: true
validated: false
stages:
    - name: my_stage
      conditional: false
      units:
          - name: my_unit
            conditional: false
            do:
                - type: insert-or-merge-row
                  topicName: target_topic
                  by:
                      jointType: and
                      filters:
                          - left:
                                kind: topic
                                topicName: target_topic
                                factorName: business_key
                            operator: equals
                            right:
                                kind: topic
                                topicName: raw_source_topic
                                factorName: business_key
                  mapping:
                      - factorName: business_key
                        source:
                            kind: topic
                            topicName: raw_source_topic
                            factorName: business_key
                  accumulateMode: standard
```

Do not include `pipelineId`, `topicId`, `factorId`, `stageId`, `unitId`, `actionId`, `tenantId`, or `version`.

---

## Enum YAML Template

```yaml
version: 1
createdAt: "2026-05-13T00:00:00"
createdBy: "1071081977535114240"
lastModifiedAt: "2026-05-13T00:00:00"
lastModifiedBy: "1071081977535114240"
tenantId: "1071081264281136128"
enumId: null # <-- MUST be null
name: MyEnum
description: My enumeration
items:
    - itemId: null # <-- MUST be null
      code: CODE_1
      label: Code 1
    - itemId: null # <-- MUST be null
      code: CODE_2
      label: Code 2
```

---

## Ingestion Table YAML Template

```yaml
version: 1
createdAt: "2026-05-13T00:00:00"
createdBy: "1071081977535114240"
lastModifiedAt: "2026-05-13T00:00:00"
lastModifiedBy: "1071081977535114240"
tenantId: "1071081264281136128"
configId: null # <-- MUST be null
name: my_table
type: table
# ... table config fields
```

---

## Ingestion Model YAML Template

```yaml
version: 1
createdAt: "2026-05-13T00:00:00"
createdBy: "1071081977535114240"
lastModifiedAt: "2026-05-13T00:00:00"
lastModifiedBy: "1071081977535114240"
tenantId: "1071081264281136128"
configId: null # <-- MUST be null
name: my_model
type: model
tables:
    - configId: null # <-- MUST be null
      name: RootTable
      parentName: null # Root table has no parent
      # ... table fields
    - configId: null # <-- MUST be null
      name: ChildTable
      parentName: RootTable # References parent table
      # ... table fields
```

---

## Ingestion Module YAML Template

```yaml
version: 1
createdAt: "2026-05-13T00:00:00"
createdBy: "1071081977535114240"
lastModifiedAt: "2026-05-13T00:00:00"
lastModifiedBy: "1071081977535114240"
tenantId: "1071081264281136128"
configId: null # <-- MUST be null
name: my_module
type: module
models:
    - configId: null # <-- MUST be null
      name: model1
      # ... model config
```

---

## Semantic Model YAML Template

```yaml
version: 1
createdAt: "2026-05-13T00:00:00"
createdBy: "1071081977535114240"
lastModifiedAt: "2026-05-13T00:00:00"
lastModifiedBy: "1071081977535114240"
tenantId: "1071081264281136128"
modelId: null # <-- MUST be null
name: my_semantic_model
# ... semantic model fields
```

---

## Metric YAML Template

```yaml
version: 1
createdAt: "2026-05-13T00:00:00"
createdBy: "1071081977535114240"
lastModifiedAt: "2026-05-13T00:00:00"
lastModifiedBy: "1071081977535114240"
tenantId: "1071081264281136128"
metricId: null # <-- MUST be null
name: my_metric
# ... metric fields
```

---

## DataSource YAML Template

```yaml
version: 1
createdAt: "2026-05-13T00:00:00"
createdBy: "1071081977535114240"
lastModifiedAt: "2026-05-13T00:00:00"
lastModifiedBy: "1071081977535114240"
tenantId: "1071081264281136128"
datasourceId: null # <-- MUST be null
name: my_datasource
type: MYSQL
# ... datasource config
```

---

## Workflow: Creating New Topic + Pipeline

### Step 1: Create Topic YAML without IDs

```yaml
# transformation/topics/my_topic.yml
name: my_topic
type: distinct
kind: business
dataSourceCode: default
factors:
    - name: field1
      type: text
      label: Field 1
```

### Step 2: Push Topic

```bash
agent-cli topic push-file transformation/topics/my_topic.yml --vault <vault> --dry-run
agent-cli topic push-file transformation/topics/my_topic.yml --vault <vault>
```

### Step 3: Create Pipeline Using Names

```yaml
# transformation/pipelines/pl_my_topic_to_target.yml
name: pl_my_topic_to_target
sourceTopicName: my_topic
type: insert-or-merge
enabled: false
validated: false
stages:
    - name: merge_target
      units:
          - name: merge_row
            do:
                - type: insert-or-merge-row
                  topicName: target_topic
                  mapping:
                      - factorName: field1
                        source:
                            kind: topic
                            topicName: my_topic
                            factorName: field1
```

### Step 4: Push Pipeline

```bash
agent-cli pipeline push-file transformation/pipelines/pl_my_topic_to_target.yml --vault <vault> --dry-run
agent-cli pipeline push-file transformation/pipelines/pl_my_topic_to_target.yml --vault <vault>
```

---

## Workflow: Creating New Enum

Legacy entities still use `null` for new IDs.

```yaml
enumId: null
name: MyEnum
items:
    - itemId: null
      code: A
      label: Option A
```

```bash
agent-cli enum push-file transformation/enums/my_enum__new.yml --vault <vault>
```

---

## Workflow: Creating Ingestion Model

Legacy ingestion configs still use `null` for new IDs.

```yaml
configId: null
name: my_model
tables:
    - configId: null
      name: root_table
      parentName: null
```

```bash
agent-cli ingest model push-file transformation/ingest/models/my_model__new.yml --vault <vault>
```

---

## Quick Reference Table

| Entity     | ID Strategy                                     | Command                          |
| ---------- | ----------------------------------------------- | -------------------------------- |
| Topic      | Omit `topicId` and `factorId`; upsert by `name` | `topic push-file [--dry-run]`    |
| Pipeline   | Omit all internal IDs; upsert by `name`         | `pipeline push-file [--dry-run]` |
| Enum       | New IDs use `null`                              | `enum push-file`                 |
| Semantic   | New IDs use `null`                              | `semantic push-file`             |
| Metric     | New IDs use `null`                              | `metric push-file`               |
| Ingestion  | New IDs use `null`                              | `ingest ... push-file`           |
| DataSource | New IDs use `null`                              | `datasource push-file`           |

---

## Common Mistakes

### Wrong: Internal IDs in Topic/Pipeline agent YAML

```yaml
topicId: "f-123456"
factorId: "f-123456-1"
pipelineId: "1490000000000000101"
```

### Correct: Topic/Pipeline no-id YAML

```yaml
name: my_topic
factors:
    - name: field1
      type: text
```

```yaml
name: pl_example
sourceTopicName: my_topic
stages: []
```

### Correct: Legacy Entity New IDs

```yaml
enumId: null
items:
    - itemId: null
```

---

## File Naming Convention

```text
Topic:    transformation/topics/{topic_name}.yml
Pipeline: transformation/pipelines/{pipeline_name}.yml
Legacy:   {name}__{id}.yml
```

---

## Key Takeaways

1. Topic/Pipeline: omit IDs entirely; use names.
2. Topic/Pipeline: files are indexed by `name` only.
3. Pipeline references use `sourceTopicName`, `topicName`, and `factorName`.
4. Legacy entities: new IDs use `null`; fake IDs are still invalid.

---

_Last Updated: 2026-06-21_
