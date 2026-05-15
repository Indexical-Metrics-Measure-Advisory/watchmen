# Source of Truth

## ID Naming Rules

When creating new resources locally, use **fake IDs** with `f-` prefix or leave the ID **empty** — the server will assign a real Snowflake ID on push:

| Scenario | ID format | Example |
|----------|-----------|---------|
| Create (local file) | `f-{type}_{name}_{seq}` or empty | `f-module_customer_001`, `f-table_order_001` |
| Update (local file) | real Snowflake ID from server | `1491090766418725888` |

- **`f-` prefix** signals "this is a placeholder, generate real ID on server".
- When the CLI pulls from server, real Snowflake IDs are stored — subsequent pushes update the existing resource.
- All IDs in local files should match the pattern `f-{resource_type}_{meaningful_name}_{sequence}` for readability.

## Local File Naming Conventions
- **General Pattern**: `{name}__{id}.yml`
- **Directory Structure**:
  ```
  vault/
  ├── .agent-cli/          # 元数据目录
  │   └── config.json
  ├── ingest/              # 采集配置
  │   ├── tables/
  │   ├── models/
  │   └── modules/
  ├── transformation/      # 转换配置（Topic/Pipeline/Subject/Enum）
  │   ├── topics/
  │   ├── pipelines/
  │   ├── subjects/
  │   └── enums/
  └── metrics/              # 指标配置
      ├── semantics/
      └── metric/
  ```
- **Topic**: `transformation/topics/{topic_name}__{topic_id}.yml`
- **Pipeline**: `transformation/pipelines/{pipeline_name}__{pipeline_id}.yml`
- **Enum**: `transformation/enums/{enum_name}__{enum_id}.yml`
- **Semantic Model**: `metrics/semantics/{model_name}__{model_id}.yml`
- **Metric**: `metrics/metric/{metric_name}__{metric_id}.yml`
- **Ingestion**:
  - Module: `ingest/modules/{module_name}__{module_id}.yml`
  - Model: `ingest/models/{model_name}__{model_id}.yml`
  - Table: `ingest/tables/{table_name}__{table_id}.yml`

## Topic
- Core fields and types: `topicId:str`, `name:str`, `description:str|None`, `type:str`, `kind:str`, `dataSourceId:str`, `factors:list[Factor]`.
- Factor core fields and types: `factorId:str`, `name:str`, `type:str`, `label:str`, `enumId:str|None`.
- Topic type candidates: `raw`, `distinct`, `aggregate`, `ratio`, `time`.
- Factor type candidates: `sequence`, `number`, `unsigned`, `text`, `address`, `continent`, `region`, `country`, `province`, `city`, `district`, `road`, `community`, `floor`, `residence_type`, `residential_area`, `email`, `phone`, `mobile`, `fax`, `gender`, `occupation`, `date_of_birth`, `age`, `id_no`, `relation`, `name`, `description`, `zip_code`, `full_name`, `first_name`, `middle_name`, `last_name`, `unit_number`, `display_name`, `abbreviation`, `nick_name`, `resource_url`, `image`, `attachment`, `institute`, `department_head`, `team`, `business_unit`, `loyalty`, `currency`, `percentage`, `permillage`, `code`, `json`, `xml`, `yaml`, `datetime`, `full_datetime`, `date`, `time`, `year`, `half_year`, `quarter`, `month`, `half_month`, `ten_days`, `week_of_year`, `week_of_month`, `half_week`, `day_of_month`, `day_of_week`, `day_kind`, `hour`, `minute`, `second`, `millisecond`, `am_pm`, `enum`.
- **System Topics**: Topics with `kind: system` (e.g., monitor logs, DQC results) **cannot be pulled or pushed** via CLI. These are managed internally by the platform.
- Prefer `kind: business` for newly created topics.
- Ensure each factor has a business-friendly `label`.
- Use `enumId` when factor value comes from enum code table.

## Pipeline
- Core fields and types: `pipelineId:str`, `name:str`, `topicId:str`, `type:str`, `enabled:bool`, `stages:list[PipelineStage]`.
- **IMPORTANT**: `topicId` MUST be at the **root level** of the YAML (same level as `name`, `type`, `tenantId`), not inside `stages`. This is the source topic ID.
- **Pipeline Update Rule**: When modifying an existing pipeline, **DO NOT create a new pipeline**. Pull the existing pipeline YAML, modify it, and push it back using the **same `pipelineId`** to update in place.
- **Pipeline Type Selection Rule**:
  - **`insert-or-merge` (DEFAULT)**: Use for most business data pipelines (Bronze→Silver, Silver→Gold, Gold→Datamart). This handles both insert new records and merge/update existing records.
  - **`insert`**: Only use for append-only data such as **logs, history, audit trails, or monitoring data** where records are never updated.
  - **`merge`**: Use when only updating existing records (no new inserts).
  - **`delete`**: Use for soft-delete or CDC delete operations.
- Trigger types: `insert`, `merge`, `insert-or-merge`, `delete`.
- Structure and types: `stages:list[PipelineStage] -> units:list[PipelineUnit] -> do:list[PipelineAction]`.
- PipelineStage: `stageId:str`, `name:str|None`, `conditional:bool|None`, `on:dict|None`, `units:list[PipelineUnit]`.
- PipelineUnit: `unitId:str`, `name:str|None`, `conditional:bool|None`, `on:dict|None`, `do:list[PipelineAction]`.
- PipelineAction common fields: `actionId:str`, `type:str`, optional `topicId:str`, `mapping:list[dict]`, `condition:dict`, `into:dict`.
- Current CLI pipeline sync uses YAML endpoints (with fallback to JSON for legacy `pipeline/import`).

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
    id: f-metric_total_claims_001
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
