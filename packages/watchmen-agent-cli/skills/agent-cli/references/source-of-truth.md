# Source of Truth

## ID Naming Rules

For detailed ID management rules, templates, and workflows for all entity types, see `references/id-management-guide.md`.

| Entity                         | Current local YAML strategy                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Topic                          | No-id agent view. Omit `topicId`, `factorId`, `tenantId`, `version`; use `name` as upsert key.                                                |
| Pipeline                       | No-id agent view. Omit `pipelineId`, `stageId`, `unitId`, `actionId`, `topicId`, `factorId`, `tenantId`, `version`; use `name` as upsert key. |
| Enum/Semantic/Metric/Ingestion | Legacy id strategy. New IDs use `null`; existing resources may contain real server IDs.                                                       |

- **Topic/Pipeline**: never invent or fill internal IDs. Use business names (`name`, `sourceTopicName`, `topicName`, `factorName`).
- **Legacy entities**: new entity IDs still use `null`; fake/placeholder IDs (e.g., `f-xxx`) can cause server errors.

## Local File Naming Conventions

- **Topic/Pipeline Pattern**: `{name}.yml` (no ID suffix).
- **Legacy Entity Pattern**: `{name}__{id}.yml`.
- **Directory Structure**:
    ```
    vault/
    ├── .agent-cli/          # metadata
    │   └── config.json
    ├── ingest/              # ingestion configs
    │   ├── tables/
    │   ├── models/
    │   └── modules/
    ├── transformation/      # transformation configs (Topic/Pipeline/Subject/Enum)
    │   ├── topics/
    │   ├── pipelines/
    │   ├── subjects/
    │   └── enums/
    └── metrics/             # metric configs
        ├── semantics/
        └── metric/
    ```
- **Topic**: `transformation/topics/{topic_name}.yml`
- **Pipeline**: `transformation/pipelines/{pipeline_name}.yml`
- **Enum**: `transformation/enums/{enum_name}__{enum_id}.yml`
- **Semantic Model**: `metrics/semantics/{model_name}__{model_id}.yml`
- **Metric**: `metrics/metric/{metric_name}__{metric_id}.yml`
- **Ingestion**:
    - Module: `ingest/modules/{module_name}__{module_id}.yml`
    - Model: `ingest/models/{model_name}__{model_id}.yml`
    - Table: `ingest/tables/{table_name}__{table_id}.yml`

## Topic

- Agent YAML core fields: `name:str`, `description:str|None`, `type:str`, `kind:str`, `dataSourceCode:str`, `factors:list[Factor]`.
- Agent YAML must NOT include `topicId`, `factorId`, `tenantId`, or `version`.
- Factor core fields: `name:str`, `type:str`, `label:str|None`, `enumId:str|None`, `description:str|None`, `defaultValue:str|None`, `flatten:bool|None`, `indexGroup:str|None`, `encrypt:str|None`, `precision:str|None`.
- Topic type candidates: `raw`, `distinct`, `aggregate`, `ratio`, `time`.
- **Factor type source of truth**: align with `watchmen-web-client/src/services/data/tuples/factor-types.ts`. Use the exact serialized enum values in YAML.
- Factor type candidates:
    - Numeric: `sequence`, `number`, `unsigned`
    - Text and generic: `text`, `boolean`, `enum`, `object`, `array`
    - Address: `address`, `continent`, `region`, `country`, `province`, `city`, `district`, `road`, `community`, `floor`, `residence-type`, `residential-area`
    - Contact: `email`, `phone`, `mobile`, `fax`
    - Datetime: `datetime`, `full-datetime`, `date`, `time`, `year`, `half-year`, `quarter`, `month`, `half-month`, `ten-days`, `week-of-year`, `week-of-month`, `half-week`, `day-of-month`, `day-of-week`, `day-kind`, `hour`, `hour-kind`, `minute`, `second`, `millisecond`, `am-pm`
    - Individual: `gender`, `occupation`, `date-of-birth`, `age`, `id-no`, `religion`, `nationality`
    - Organization: `biz-trade`, `biz-scale`
- Factor type recommendations:
    - Use `sequence` for generated technical identifiers or row sequence fields.
    - Use `unsigned` for non-negative counts and amounts; use `number` when negative or decimal values are possible.
    - Use `text` as the default for free-form strings; switch to a semantic subtype only when downstream logic depends on it.
    - Use `enum` together with `enumId` for coded business values instead of plain `text`.
    - Use `date`, `datetime`, or `full-datetime` for real timestamps instead of storing them as `text`.
    - Use `boolean` for flags; avoid modeling `Y/N` or `0/1` flags as `text` unless source compatibility requires it.
    - Use `object` and `array` only for raw payload retention; prefer flattened business factors for downstream pipelines and metrics.
    - For numeric factors used in comparison or calculation, prefer `number`, `unsigned`, `age`, `residential-area`, or `biz-scale`.
- Naming note: use hyphenated serialized values such as `residence-type`, `date-of-birth`, `full-datetime`, `half-year`, `week-of-year`, and `am-pm`. Do not use underscore variants in YAML.
- **System Topics**: Topics with `kind: system` (e.g., monitor logs, DQC results) **cannot be pulled or pushed** via CLI. These are managed internally by the platform.
- Prefer `kind: business` for newly created topics.
- Ensure each factor has a business-friendly `label`.
- Use `enumId` when factor value comes from enum code table.

## Pipeline

- Agent YAML core fields: `name:str`, `sourceTopicName:str`, `type:str`, `enabled:bool`, `validated:bool|None`, `conditional:bool|None`, `on:dict|None`, `stages:list[PipelineStage]`.
- Agent YAML must NOT include `pipelineId`, `topicId`, `factorId`, `stageId`, `unitId`, `actionId`, `tenantId`, or `version`.
- **IMPORTANT**: `sourceTopicName` MUST be at the root level. This is the source topic name that triggers the pipeline.
- **Pipeline Update Rule**: update is resolved by `pipeline.name` on the server. Do not manually set `pipelineId`.
- **Pipeline Type Selection Rule**:
    - **`insert-or-merge` (DEFAULT)**: Use for most business data pipelines (Bronze→Silver, Silver→Gold, Gold→Datamart). This handles both insert new records and merge/update existing records.
    - **`insert`**: Only use for append-only data such as **logs, history, audit trails, or monitoring data** where records are never updated.
    - **`merge`**: Use when only updating existing records (no new inserts).
    - **`delete`**: Use for soft-delete or CDC delete operations.
- Trigger types: `insert`, `merge`, `insert-or-merge`, `delete`.
- Structure and types: `stages:list[PipelineStage] -> units:list[PipelineUnit] -> do:list[PipelineAction]`.
- PipelineStage: `name:str|None`, `conditional:bool|None`, `on:dict|None`, `units:list[PipelineUnit]`.
- PipelineUnit: `name:str|None`, `conditional:bool|None`, `on:dict|None`, `do:list[PipelineAction]`.
- PipelineAction common fields: `type:str`, optional `topicName:str`, optional `factorName:str`, `mapping:list[dict]`, `by:dict|None`, `source:dict|None`.
- In parameter expressions, use `kind: topic`, `topicName`, and `factorName` instead of `topicId`/`factorId`.
- Current CLI pipeline sync uses `/pipeline/*/agent-view` and `/pipeline/yaml/agent-upsert`.

## Ingestion

- Module model (`CollectorModuleConfig`):
    - Core fields: `moduleId:str`, `moduleName:str`, `tenantId:str|None`, `description:str|None`, `priority:int (=0)`.
- Model config (`CollectorModelConfig`):
    - Core fields: `modelId:str`, `modelName:str`, `moduleId:str`, `tenantId:str|None`, `dependOn:list[str]|None`, `priority:int (=0)`, `rawTopicCode:str|None`, `isParalleled:bool|None`.
- Table config (`CollectorTableConfig`):
    - Core fields: `configId:str`, `name:str`, `tableName:str`, `modelName:str`, `tenantId:str|None`, `primaryKey:list[str]|None`, `objectKey:str|None`, `sequenceKey:str|None`, `parentName:str|None`, `label:str|None`, `joinKeys:list[JoinCondition]|None`, `dependOn:list[Dependence]|None`, `auditColumn:str|None`, `ignoredColumns:list[str]|None`, `jsonColumns:list[JsonColumn]|None`, `conditions:list[Condition]|None`, `dataSourceId:str|None`, `isList:bool (=False)`, `triggered:bool (=False)`.
    - `JoinCondition`: `parentKey:Condition|None`, `childKey:Condition|None`.
    - `Dependence`: `modelName:str|None`, `objectKey:str|None`.
    - `JsonColumn`: `columnName:str|None`, `ignoredPath:list[str]|None`, `needFlatten:bool|None`, `flattenPath:list[str]|None`, `jsonPath:list[str]|None`.
    - `Condition` (supports two forms):
        - Expression: `columnName:str`, `operator:str` (e.g. `equals`, `greater_than`, `less_than`, `like`, `in`), `columnValue:str|int|list|None`.
        - Joint: `conjunction:str` (`and`|`or`), `children:list[Condition]|None`.
    - Ingestion relation: `module(1) -> model(N) -> table config(N)`.

## MetricFlow

- Semantic model:
    - Core fields and types: `id:str`, `name:str`, `sourceType:str`, `topicId:str|None`, `node_relation:dict|None`, `entities:list[dict]`, `measures:list[dict]`, `dimensions:list[dict]`.
    - `sourceType` candidates: `TOPIC`, `MANUAL`.
    - `node_relation` shape: `alias:str`, `schema_name:str|None`, `database:str|None`, `relation_name:str`.
    - `entities[]` item shape: `name:str`, `type:str`, `expr:str|None`.
    - `measures[]` item shape: `name:str`, `agg:str`, `expr:str|None`.
    - `dimensions[]` item shape: `name:str`, `type:str`, `expr:str|None`, `type_params:dict|None`.
    - YAML endpoints: `/metricflow/semantic-model/name/yaml`, `/metricflow/semantic-model/yaml`
- Metric:
    - Core fields and types: `id:str`, `name:str`, `type:MetricType`, `label:str|None`, `description:str|None`, `filter:str|None`, `categoryId:str|None`, `time_granularity:str|None`, `type_params:MetricTypeParams`.
    - Metric type candidates: `simple`, `ratio`, `cumulative`, `derived`, `conversion`.
    - `MetricTypeParams` common fields: `measure:MeasureReference|None`, `numerator:MeasureReference|None`, `denominator:MeasureReference|None`, `expr:str|None`, `window:WindowParams|None`, `grain_to_date:str|None`, `metrics:list[MetricRef]|None`, `conversion_type_params:ConversionTypeParams|None`, `cumulative_type_params:CumulativeTypeParams|None`, `input_measures:list[MeasureReference]`.
    - `MeasureReference`: `name:str`, `filter:str|None`, `alias:str|None`, `join_to_timespine:bool (=False)`, `fill_Nones_with:Any|None`.
    - `WindowParams`: `count:int|None`, `granularity:str|None`, `window_string:str|None`, `is_standard_granularity:bool|None`.
    - `MetricRef`: `name:str`, `filter:str|None`, `alias:str|None`, `offset_window:OffsetWindow|None`, `offset_to_grain:str|None`.
    - `OffsetWindow`: `count:int`, `granularity:str|None`.
    - `ConversionTypeParams`: `entity:str`, `calculation:ConversionCalculationType`, `base_measure:MetricInput`, `conversion_measure:MetricInput`, `window:MetricTimeWindow|None`, `constant_properties:list[dict]|None`.
        - `calculation` options: `conversions` (buys), `conversion_rate` (buys/visits).
        - `base_measure` / `conversion_measure` (`MetricInput`): `name:str`, `filter:str|None`, `fill_Nones_with:Any|None`, `join_to_timespine:bool`.
        - `window` (`MetricTimeWindow`): `count:int`, `granularity:TimeGranularity` (e.g., `day`, `week`, `month`).
        - `constant_properties[]` item: `base_property:str`, `conversion_property:str`.
    - `CumulativeTypeParams`: `window:MetricTimeWindow|None`, other cumulative-specific fields.
    - Example YAML (simple metric):
        ```yaml
        id: null
        name: total_claim_cases
        label: Total Claim Cases
        description: Total number of claim cases
        type: simple
        type_params:
            expr: null
            window: null
            measure:
                name: count_claim_cases
                alias: null
                filter: null
                fill_Nones_with: null
                join_to_timespine: false
            metrics: []
            numerator: null
            denominator: null
            grain_to_date: null
            input_measures:
                - name: count_claim_cases
                  alias: null
                  filter: null
                  fill_Nones_with: null
                  join_to_timespine: false
            conversion_type_params: null
            cumulative_type_params: null
        ```
    - YAML endpoints: `/metricflow/metric/name/yaml`, `/metricflow/metric/yaml`
