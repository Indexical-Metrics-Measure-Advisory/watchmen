# Pipeline Development Guide

## Overview

This guide is for building `pipeline` YAML or JSON payloads that can be pulled, edited, validated, and pushed by `agent-cli`.

A pipeline payload has four nested layers:

```text
pipeline
  -> stages[]
     -> units[]
        -> do[]
```

When writing a new pipeline, focus on the actual YAML or JSON structure exchanged with the server.

---

## Workflow Rules (CRITICAL)

**NEVER create duplicate pipelines.** Always check remote first before creating.

### Step 1: Check Remote

```bash
agent-cli pipeline list-remote --vault <vault>
```

If pipeline with the same name exists, you MUST update it instead of creating a new one.

### Step 2: Determine Create vs Update

| Scenario | Action | pipelineId Value |
|----------|--------|------------------|
| Pipeline does not exist in remote | Create new | `pipelineId: null` |
| Pipeline exists in remote | Update existing | `pipelineId: '<existing_id>'` |

### Step 3: Prepare YAML

**For new pipeline:**
```yaml
pipelineId: null
topicId: '<source_topic_id>'
name: pl_example
...
```

**For updating existing pipeline:**
```yaml
pipelineId: '1504912804757792768'  # Must use existing pipeline ID
topicId: '<source_topic_id>'
name: pl_example
...
```

### Step 4: Push

```bash
agent-cli pipeline push-file <file_path> --vault <vault>
```

- New: returns `pipelineId: '<new_id>'` and `replaced: false`
- Update: returns same `pipelineId` and `replaced: true`

### Common Mistake

Using `pipelineId: null` when updating an existing pipeline creates a NEW pipeline instead of updating. Always verify the pipeline exists in remote and use the correct ID.

### File Naming

Local files MUST use format: `{pipeline_name}__{pipeline_id}.yml`

Example: `pl_raw_crm_customer_to_customer__1504912583785080832.yml`

### Quick Checklist

- [ ] Run `list-remote` to verify if pipeline exists
- [ ] If exists, set `pipelineId` to existing ID (NOT null)
- [ ] If not exists, use `pipelineId: null`
- [ ] Use correct filename format with pipeline ID
- [ ] After push, verify `replaced: true` for updates

---

## Payload Structure

A pipeline payload is composed of:

1. top-level pipeline fields
2. `stages[]`
3. `units[]`
4. `do[]` action payloads

### Top-Level Pipeline Fields

| Field | Type | Required | Notes |
|------|------|----------|------|
| `pipelineId` | `string` or `null` | Yes | Use `null` for a new pipeline. |
| `topicId` | `string` | Yes | Source topic ID that triggers the pipeline. |
| `name` | `string` | Yes | Unique pipeline name. |
| `type` | `string` | Yes | `insert`, `merge`, `insert-or-merge`, `delete`. |
| `enabled` | `boolean` | Yes | Keep `false` while drafting. |
| `validated` | `boolean` | Recommended | Usually `false` while drafting. |
| `conditional` | `boolean` | Recommended | Whether this payload uses conditions. |
| `on` | `object` | Optional | Top-level condition payload. |
| `stages` | `array` | Yes | Ordered pipeline stages. |
| `tenantId` | `string` | Usually yes | Tenant scope. |
| `version` | `number` | Optional | Often present in pulled payloads. |
| `createdAt` | `string` | Optional | Usually server-managed. |
| `createdBy` | `string` | Optional | Usually server-managed. |
| `lastModifiedAt` | `string` | Optional | Usually server-managed. |
| `lastModifiedBy` | `string` | Optional | Usually server-managed. |

### Stage Fields

Each item in `stages[]` uses this shape:

| Field | Type | Required | Notes |
|------|------|----------|------|
| `stageId` | `string` or `null` | Yes | Use `null` for a new stage. |
| `name` | `string` | Yes | Stage name. |
| `conditional` | `boolean` | Recommended | Whether this stage has a condition. |
| `on` | `object` | Optional | Stage condition. |
| `units` | `array` | Yes | Units inside this stage. |

### Unit Fields

Each item in `units[]` uses this shape:

| Field | Type | Required | Notes |
|------|------|----------|------|
| `unitId` | `string` or `null` | Yes | Use `null` for a new unit. |
| `name` | `string` | Yes | Unit name. |
| `conditional` | `boolean` | Recommended | Whether this unit has a condition. |
| `on` | `object` | Optional | Unit condition. |
| `loopVariableName` | `string` | Optional | Loop through an array variable when needed. |
| `do` | `array` | Yes | Ordered action list. |

### Loop Unit Pattern

Use `loopVariableName` when one source factor contains an array and the unit needs to execute once for each element in that array.

Typical loop flow, using a CRM-style example:

1. use `copy-to-memory` to copy an array field such as a lead's contact list into a pipeline variable,
2. set `loopVariableName` on the next unit so the unit runs once for each contact item,
3. inside that unit, use variable placeholders to map the current contact item into the target topic.

Example mapping for one CRM contact field:

```yaml
mapping:
  - arithmetic: none
    source:
      kind: constant
      value: '{lv_contact.email}'
    factorId: '<contact_email_factor_id>'
```

In this example:

- `lv_contact` is the loop variable,
- `{lv_contact.email}` reads the current contact item's email,
- `factorId` points to the target factor such as `crm_contact.email`.

Common use cases:

- flatten nested array data into a target topic,
- split one source row into many target rows,
- conditionally delete rows based on each loop item,
- merge child records from a raw payload into a business topic.

### Action Base Fields

Every item in `do[]` starts with:

| Field | Type | Required | Notes |
|------|------|----------|------|
| `actionId` | `string` or `null` | Yes | Use `null` for a new action. |
| `type` | `string` | Yes | Action type. |

Depending on the action type, additional fields are required, such as:

- `topicId`
- `factorId`
- `mapping`
- `by`
- `source`
- `variableName`
- `accumulateMode`
- `arithmetic`

---

## Trigger Types

Use one of the following values for top-level `type`:

- `insert`
- `merge`
- `insert-or-merge`
- `delete`

---

## Action Types

### System Actions

- `alarm`
- `copy-to-memory`
- `write-to-external`

### Read Actions

- `read-row`
- `read-factor`
- `exists`
- `read-rows`
- `read-factors`

### Write Actions

- `merge-row`
- `insert-row`
- `insert-or-merge-row`
- `write-factor`

### Delete Actions

- `delete-row`
- `delete-rows`

---

## Parameter Payloads

### Topic Parameter

Use this when a value comes from a topic factor:

```yaml
kind: topic
topicId: '<topic_id>'
factorId: '<factor_id>'
```

### Constant Parameter

Use this when a value is fixed:

```yaml
kind: constant
value: 'ACTIVE'
```

### Computed Parameter

Use this when a value is derived from another value:

```yaml
kind: computed
type: year-of
parameters:
  - kind: topic
    topicId: '<topic_id>'
    factorId: '<datetime_factor_id>'
```

Common computed values include:

- `add`
- `subtract`
- `multiply`
- `divide`
- `modulus`
- `year-of`
- `half-year-of`
- `quarter-of`
- `month-of`
- `week-of-year`
- `week-of-month`
- `day-of-month`
- `day-of-week`
- `case-then`

---

## Condition Payload

Conditions are commonly used in:

- pipeline `on`
- stage `on`
- unit `on`
- action `by`

A typical condition payload looks like this:

```yaml
jointType: and
filters:
  - left:
      kind: topic
      topicId: '<source_topic_id>'
      factorId: '<source_factor_id>'
    operator: equals
    right:
      kind: constant
      value: 'ACTIVE'
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

---

## Mapping Payload

For write-row style actions, the canonical mapping payload is:

```yaml
mapping:
  - arithmetic: none
    source:
      kind: topic
      topicId: '<source_topic_id>'
      factorId: '<source_factor_id>'
    factorId: '<target_factor_id>'
```

Important rules:

- action-level `topicId` points to the target topic,
- `mapping[].factorId` points to the target factor,
- `mapping[].source` describes where the value comes from.

### Aggregate Arithmetic Values

Use one of:

- `none`
- `count`
- `sum`
- `avg`

### Accumulate Mode Values

Use one of:

- `standard`
- `reverse`
- `cumulate`

---

## YAML Examples

### Pipeline Shell

```yaml
pipelineId: null
topicId: '<source_topic_id>'
name: pl_crm_lead_sync
type: insert-or-merge
enabled: false
validated: false
conditional: false
tenantId: '<tenant_id>'
stages: []
```

### Stage And Unit Shell

```yaml
stages:
  - stageId: null
    name: enrich_customer
    conditional: false
    units:
      - unitId: null
        name: merge_customer_row
        conditional: false
        do: []
```

### Loop And Flatten Example

This pattern is useful when a raw topic contains an array field and each array item needs to become one target row.

```yaml
pipelineId: '1452617339510260737'
name: Flatten to [t_add_invest_cx]
topicId: '<raw_life_pa_batch_topic_id>'
type: insert-or-merge
conditional: false
enabled: true
createdAt: '2024-07-04T11:20:57'
lastModifiedAt: '2026-03-10T20:53:32'
stages:
  - stageId: null
    name: Copy data stage
    conditional: false
    units:
      - unitId: null
        name: Prepare loop variable
        conditional: false
        do:
          - actionId: null
            type: copy-to-memory
            variableName: lv_t_add_invest_cx
            source:
              kind: topic
              topicId: '<raw_life_pa_batch_topic_id>'
              factorId: '<t_add_invest_cx_factor_id>'

      - unitId: null
        name: Copy data unit
        loopVariableName: lv_t_add_invest_cx
        conditional: false
        do:
          - actionId: null
            type: insert-or-merge-row
            topicId: '<t_add_invest_cx_topic_id>'
            accumulateMode: standard
            by:
              jointType: and
              filters:
                - left:
                    kind: topic
                    topicId: '<t_add_invest_cx_topic_id>'
                    factorId: '<policy_chg_id_factor_id>'
                  operator: equals
                  right:
                    kind: constant
                    value: '{lv_t_add_invest_cx.policy_chg_id}'
                - left:
                    kind: topic
                    topicId: '<t_add_invest_cx_topic_id>'
                    factorId: '<add_prem_id_factor_id>'
                  operator: equals
                  right:
                    kind: constant
                    value: '{lv_t_add_invest_cx.add_prem_id}'
            mapping:
              - arithmetic: none
                source:
                  kind: constant
                  value: '{lv_t_add_invest_cx.add_prem_id}'
                factorId: '<add_prem_id_factor_id>'
              - arithmetic: none
                source:
                  kind: constant
                  value: '{lv_t_add_invest_cx.add_prem_type}'
                factorId: '<add_prem_type_factor_id>'
              - arithmetic: none
                source:
                  kind: constant
                  value: '{lv_t_add_invest_cx.change_id}'
                factorId: '<change_id_factor_id>'
              - arithmetic: none
                source:
                  kind: constant
                  value: '{lv_t_add_invest_cx.change_seq}'
                factorId: '<change_seq_factor_id>'
              - arithmetic: none
                source:
                  kind: constant
                  value: '{lv_t_add_invest_cx.item_id}'
                factorId: '<item_id_factor_id>'
              - arithmetic: none
                source:
                  kind: constant
                  value: '{lv_t_add_invest_cx.log_id}'
                factorId: '<log_id_factor_id>'
              - arithmetic: none
                source:
                  kind: constant
                  value: '{lv_t_add_invest_cx.log_type}'
                factorId: '<log_type_factor_id>'
              - arithmetic: none
                source:
                  kind: constant
                  value: '{lv_t_add_invest_cx.oper_type}'
                factorId: '<oper_type_factor_id>'
              - arithmetic: none
                source:
                  kind: constant
                  value: '{lv_t_add_invest_cx.policy_chg_id}'
                factorId: '<policy_chg_id_factor_id>'
              - arithmetic: none
                source:
                  kind: constant
                  value: '{lv_t_add_invest_cx.policy_id}'
                factorId: '<policy_id_factor_id>'
              - arithmetic: none
                source:
                  kind: constant
                  value: '{lv_t_add_invest_cx.pre_log_id}'
                factorId: '<pre_log_id_factor_id>'

      - unitId: null
        name: delete data
        loopVariableName: lv_t_add_invest_cx
        conditional: true
        on:
          jointType: and
          filters:
            - left:
                kind: constant
                value: '{lv_t_add_invest_cx.oper_type}'
              operator: equals
              right:
                kind: constant
                value: '3'
        do:
          - actionId: null
            type: delete-rows
            topicId: '<t_add_invest_cx_topic_id>'
            by:
              jointType: and
              filters:
                - left:
                    kind: topic
                    topicId: '<t_add_invest_cx_topic_id>'
                    factorId: '<policy_chg_id_factor_id>'
                  operator: equals
                  right:
                    kind: constant
                    value: '{lv_t_add_invest_cx.policy_chg_id}'
                - left:
                    kind: topic
                    topicId: '<t_add_invest_cx_topic_id>'
                    factorId: '<add_prem_id_factor_id>'
                  operator: equals
                  right:
                    kind: constant
                    value: '{lv_t_add_invest_cx.add_prem_id}'
```

Loop scenario notes:

- `copy-to-memory` prepares the array variable for looping,
- `loopVariableName` makes the unit execute once for each item in the array,
- placeholders like `{lv_t_add_invest_cx.add_prem_id}` refer to fields on the current loop item,
- `conditional: true` on a loop unit is useful for item-level delete or skip logic.

### Insert Row Action

```yaml
- actionId: null
  type: insert-row
  topicId: '<target_topic_id>'
  accumulateMode: standard
  mapping:
    - arithmetic: none
      source:
        kind: topic
        topicId: '<source_topic_id>'
        factorId: '<source_name_factor_id>'
      factorId: '<target_name_factor_id>'
```

### Insert-Or-Merge Row Action

```yaml
- actionId: null
  type: insert-or-merge-row
  topicId: '<target_topic_id>'
  accumulateMode: standard
  by:
    jointType: and
    filters:
      - left:
          kind: topic
          topicId: '<source_topic_id>'
          factorId: '<source_business_key_factor_id>'
        operator: equals
        right:
          kind: topic
          topicId: '<target_topic_id>'
          factorId: '<target_business_key_factor_id>'
  mapping:
    - arithmetic: none
      source:
        kind: topic
        topicId: '<source_topic_id>'
        factorId: '<source_name_factor_id>'
      factorId: '<target_name_factor_id>'
```

### Write Factor Action

```yaml
- actionId: null
  type: write-factor
  topicId: '<target_topic_id>'
  factorId: '<target_factor_id>'
  arithmetic: none
  by:
    jointType: and
    filters:
      - left:
          kind: topic
          topicId: '<source_topic_id>'
          factorId: '<source_business_key_factor_id>'
        operator: equals
        right:
          kind: topic
          topicId: '<target_topic_id>'
          factorId: '<target_business_key_factor_id>'
  source:
    kind: topic
    topicId: '<source_topic_id>'
    factorId: '<source_value_factor_id>'
```

### Read Factor Action

```yaml
- actionId: null
  type: read-factor
  topicId: '<lookup_topic_id>'
  factorId: '<lookup_value_factor_id>'
  variableName: industry_name
  arithmetic: none
  by:
    jointType: and
    filters:
      - left:
          kind: topic
          topicId: '<source_topic_id>'
          factorId: '<source_code_factor_id>'
        operator: equals
        right:
          kind: topic
          topicId: '<lookup_topic_id>'
          factorId: '<lookup_code_factor_id>'
```

### Copy To Memory Action

```yaml
- actionId: null
  type: copy-to-memory
  variableName: customer_name
  source:
    kind: topic
    topicId: '<source_topic_id>'
    factorId: '<source_name_factor_id>'
```

### Delete Row Action

```yaml
- actionId: null
  type: delete-row
  topicId: '<target_topic_id>'
  by:
    jointType: and
    filters:
      - left:
          kind: topic
          topicId: '<source_topic_id>'
          factorId: '<source_business_key_factor_id>'
        operator: equals
        right:
          kind: topic
          topicId: '<target_topic_id>'
          factorId: '<target_business_key_factor_id>'
```

---

## JSON Example

The same payload can also be represented in JSON:

```json
{
  "pipelineId": null,
  "topicId": "<source_topic_id>",
  "name": "pl_crm_lead_sync",
  "type": "insert-or-merge",
  "enabled": false,
  "validated": false,
  "conditional": false,
  "tenantId": "<tenant_id>",
  "stages": [
    {
      "stageId": null,
      "name": "sync_customer",
      "conditional": false,
      "units": [
        {
          "unitId": null,
          "name": "merge_customer",
          "conditional": false,
          "do": [
            {
              "actionId": null,
              "type": "insert-or-merge-row",
              "topicId": "<target_topic_id>",
              "accumulateMode": "standard",
              "by": {
                "jointType": "and",
                "filters": []
              },
              "mapping": []
            }
          ]
        }
      ]
    }
  ]
}
```

---

## CLI Workflow

### 1. Pull Reference Objects

```bash
agent-cli pipeline list-remote --vault <vault>
agent-cli pipeline pull-name "existing_pipeline_name" --vault <vault>
agent-cli topic list-remote --vault <vault>
agent-cli topic pull-name "crm_lead" --vault <vault>
agent-cli topic pull-name "customer_profile" --vault <vault>
```

### 2. Build Local YAML

Use the local path:

```text
<vault>/transformation/pipelines/<pipeline_name>__<id>.yml
```

For a new pipeline:

- `pipelineId: null`
- `stageId: null`
- `unitId: null`
- `actionId: null`
- use a real source `topicId`
- use real target `topicId`
- use real factor IDs in `mapping`, `factorId`, and `by`

### 3. Push The Pipeline

```bash
agent-cli pipeline push-file <vault>/transformation/pipelines/<pipeline_name>.yml --vault <vault>
```

### 4. Pull Again If Needed

```bash
agent-cli pipeline pull-name "<pipeline_name>" --vault <vault>
```

---

## Development Rules

- keep `enabled: false` while drafting,
- use real topic IDs and factor IDs before push,
- use `null` for new `pipelineId`, `stageId`, `unitId`, and `actionId`,
- keep one pipeline focused on one business purpose,
- keep stage and unit names readable,
- prefer explicit `by` conditions,
- use current action names only,
- write mappings using `mapping[].factorId`, not a nested `target` object.

---

## Common Mistakes

### Using Outdated Action Names

Avoid these outdated names:

- `insert-or-update-row`
- `update-row`
- `remove-from-memory`
- `raw-to-specified-topic`

Use the current payload values instead:

- `insert-row`
- `merge-row`
- `insert-or-merge-row`
- `write-factor`
- `read-row`
- `read-rows`
- `read-factor`
- `read-factors`
- `exists`
- `delete-row`
- `delete-rows`
- `alarm`
- `copy-to-memory`
- `write-to-external`

### Using The Wrong Mapping Structure

Correct:

```yaml
mapping:
  - arithmetic: none
    source: <Parameter>
    factorId: '<target_factor_id>'
```

Incorrect:

```yaml
mapping:
  - source: ...
    target:
      topicId: ...
      factorId: ...
```

### Forgetting `by` On Merge-Style Actions

`merge-row`, `insert-or-merge-row`, `delete-row`, `delete-rows`, `read-row`, `read-rows`, `exists`, and `write-factor` usually need `by`.

### Using Fake IDs For New Parts

For new objects, keep these as `null`:

- `pipelineId`
- `stageId`
- `unitId`
- `actionId`

### Building Against Missing Factor IDs

Always pull the source and target topics first so the real factor IDs are available.

---

## Validation Checklist

Before pushing a pipeline YAML or JSON payload:

- [ ] `type` is one of `insert`, `merge`, `insert-or-merge`, `delete`
- [ ] top-level `topicId` is a real source topic ID
- [ ] every new `pipelineId`, `stageId`, `unitId`, `actionId` is `null`
- [ ] every action `type` uses a supported payload value
- [ ] every `mapping.factorId` points to a real target factor
- [ ] every `source` uses a valid parameter structure
- [ ] every `by` uses a valid condition structure
- [ ] `enabled` is `false` while drafting
- [ ] target topics and target factor IDs are already known

---

## Quick Reference

### Pipeline Shell

```yaml
pipelineId: null
topicId: '<source_topic_id>'
name: '<pipeline_name>'
type: insert-or-merge
enabled: false
validated: false
conditional: false
tenantId: '<tenant_id>'
stages: []
```

### Stage Shell

```yaml
- stageId: null
  name: '<stage_name>'
  conditional: false
  units: []
```

### Unit Shell

```yaml
- unitId: null
  name: '<unit_name>'
  conditional: false
  do: []
```

### Action Shell

```yaml
- actionId: null
  type: '<action_type>'
```
