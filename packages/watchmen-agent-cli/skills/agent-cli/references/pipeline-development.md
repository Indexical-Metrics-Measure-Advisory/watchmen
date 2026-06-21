# Pipeline Development Guide

## Current Strategy

Pipeline YAML used by `agent-cli` is now an **agent no-id view**.

Do **not** include internal IDs:

- `pipelineId`
- `tenantId`
- `version`
- `stageId`
- `unitId`
- `actionId`
- `topicId`
- `factorId`

The server resolves and persists internal IDs via `/pipeline/yaml/agent-upsert`.

## Workflow Rules

1. Check remote first:

```bash
agent-cli pipeline list-remote --vault <vault>
```

2. If a pipeline with the same `name` exists, keep the same name and update it.
3. If it does not exist, create a new YAML with the desired `name`.
4. Run dry-run before real push:

```bash
agent-cli pipeline push-file <file_path> --vault <vault> --dry-run
agent-cli pipeline push-file <file_path> --vault <vault>
```

Create/update is decided by `pipeline.name`; do not set `pipelineId` manually.

## File Naming

Local pipeline files use pipeline name only:

```text
transformation/pipelines/{pipeline_name}.yml
```

Example:

```text
transformation/pipelines/pl_raw_crm_customer_to_customer.yml
```

## Top-Level Pipeline Fields

| Field             | Required    | Notes                                           |
| ----------------- | ----------- | ----------------------------------------------- |
| `name`            | Yes         | Unique pipeline name. Upsert key.               |
| `sourceTopicName` | Yes         | Source topic name that triggers the pipeline.   |
| `type`            | Yes         | `insert`, `merge`, `insert-or-merge`, `delete`. |
| `enabled`         | Recommended | Usually `false` while drafting.                 |
| `validated`       | Recommended | Usually `false` while drafting.                 |
| `conditional`     | Optional    | Whether top-level `on` is active.               |
| `on`              | Optional    | Condition payload.                              |
| `stages`          | Yes         | Ordered stages.                                 |

## Reference Rules

Use names everywhere.

| Full model field     | Agent YAML field       |
| -------------------- | ---------------------- |
| root `topicId`       | root `sourceTopicName` |
| action `topicId`     | action `topicName`     |
| action `factorId`    | action `factorName`    |
| `mapping[].factorId` | `mapping[].factorName` |
| parameter `topicId`  | parameter `topicName`  |
| parameter `factorId` | parameter `factorName` |

## Structure

```text
pipeline
  -> stages[]
     -> units[]
        -> do[]
```

### Stage

```yaml
- name: stage_name
  conditional: false
  on: null
  units: []
```

No `stageId`.

### Unit

```yaml
- name: unit_name
  conditional: false
  loopVariableName: lv_items
  on: null
  do: []
```

No `unitId`.

### Action

Every action has `type`. Some actions also have `topicName`, `factorName`, `by`, `source`, `mapping`, `variableName`, `accumulateMode`, or `arithmetic`.

No `actionId`.

## Parameter Payloads

### Topic Parameter

```yaml
kind: topic
topicName: raw_order
factorName: order_id
```

### Constant Parameter

```yaml
kind: constant
value: ACTIVE
```

### Computed Parameter

```yaml
kind: computed
type: year-of
parameters:
    - kind: topic
      topicName: raw_order
      factorName: order_date
```

## Condition Payload

```yaml
jointType: and
filters:
    - left:
          kind: topic
          topicName: raw_order
          factorName: status
      operator: equals
      right:
          kind: constant
          value: ACTIVE
```

Common `jointType` values:

- `and`
- `or`

Common operators:

- `equals`
- `not-equals`
- `less`
- `less-equals`
- `more`
- `more-equals`
- `in`
- `not-in`
- `empty`
- `not-empty`

## Write Row Mapping

For write-row style actions, action-level `topicName` is the target topic. `mapping[].factorName` is the target factor. `mapping[].source` describes the source value.

```yaml
- type: insert-or-merge-row
  topicName: dwd_order
  accumulateMode: standard
  by:
      jointType: and
      filters:
          - left:
                kind: topic
                topicName: dwd_order
                factorName: order_id
            operator: equals
            right:
                kind: topic
                topicName: raw_order
                factorName: order_id
  mapping:
      - factorName: order_id
        arithmetic: none
        source:
            kind: topic
            topicName: raw_order
            factorName: order_id
      - factorName: order_amount
        arithmetic: none
        source:
            kind: topic
            topicName: raw_order
            factorName: amount
```

## Action Examples

### Insert Row

```yaml
- type: insert-row
  topicName: target_topic
  accumulateMode: standard
  mapping:
      - factorName: target_name
        arithmetic: none
        source:
            kind: topic
            topicName: source_topic
            factorName: source_name
```

### Insert-Or-Merge Row

```yaml
- type: insert-or-merge-row
  topicName: target_topic
  accumulateMode: standard
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
                topicName: source_topic
                factorName: business_key
  mapping:
      - factorName: target_name
        arithmetic: none
        source:
            kind: topic
            topicName: source_topic
            factorName: source_name
```

### Write Factor

```yaml
- type: write-factor
  topicName: target_topic
  factorName: target_factor
  arithmetic: none
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
                topicName: source_topic
                factorName: business_key
  source:
      kind: topic
      topicName: source_topic
      factorName: source_value
```

### Read Factor

```yaml
- type: read-factor
  topicName: lookup_topic
  factorName: lookup_value
  variableName: lookupValue
  arithmetic: none
  by:
      jointType: and
      filters:
          - left:
                kind: topic
                topicName: lookup_topic
                factorName: lookup_code
            operator: equals
            right:
                kind: topic
                topicName: source_topic
                factorName: source_code
```

### Copy To Memory

```yaml
- type: copy-to-memory
  variableName: customerName
  source:
      kind: topic
      topicName: source_topic
      factorName: customer_name
```

### Delete Row

```yaml
- type: delete-row
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
                topicName: source_topic
                factorName: business_key
```

## Loop Unit Pattern

Use `loopVariableName` when one source factor contains an array and a unit must execute once per item.

```yaml
stages:
    - name: flatten_items
      units:
          - name: prepare_loop
            do:
                - type: copy-to-memory
                  variableName: lv_items
                  source:
                      kind: topic
                      topicName: raw_order
                      factorName: items
          - name: merge_each_item
            loopVariableName: lv_items
            do:
                - type: insert-or-merge-row
                  topicName: order_item
                  by:
                      jointType: and
                      filters:
                          - left:
                                kind: topic
                                topicName: order_item
                                factorName: item_id
                            operator: equals
                            right:
                                kind: constant
                                value: "{lv_items.item_id}"
                  mapping:
                      - factorName: item_id
                        source:
                            kind: constant
                            value: "{lv_items.item_id}"
                      - factorName: item_name
                        source:
                            kind: constant
                            value: "{lv_items.item_name}"
```

## Full Minimal Example

```yaml
name: pl_raw_order_to_dwd_order
sourceTopicName: raw_order
type: insert-or-merge
enabled: false
validated: false
conditional: false
stages:
    - name: merge_order
      conditional: false
      units:
          - name: merge_order_row
            conditional: false
            do:
                - type: insert-or-merge-row
                  topicName: dwd_order
                  accumulateMode: standard
                  by:
                      jointType: and
                      filters:
                          - left:
                                kind: topic
                                topicName: dwd_order
                                factorName: order_id
                            operator: equals
                            right:
                                kind: topic
                                topicName: raw_order
                                factorName: order_id
                  mapping:
                      - factorName: order_id
                        arithmetic: none
                        source:
                            kind: topic
                            topicName: raw_order
                            factorName: order_id
                      - factorName: amount
                        arithmetic: none
                        source:
                            kind: topic
                            topicName: raw_order
                            factorName: amount
```

## Checklist

- [ ] `name` is unique and stable.
- [ ] `sourceTopicName` exists.
- [ ] No internal IDs appear anywhere in the YAML.
- [ ] Every `topicName` exists.
- [ ] Every `factorName` exists in its referenced topic.
- [ ] `mapping[].factorName` exists in the action target `topicName`.
- [ ] `by` conditions use valid `topicName` / `factorName` pairs.
- [ ] `agent-cli pipeline push-file <file> --dry-run` passes before real push.
