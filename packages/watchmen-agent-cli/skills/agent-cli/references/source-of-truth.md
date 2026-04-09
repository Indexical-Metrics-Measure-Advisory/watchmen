# Source of Truth

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
- Prefer `kind: business` for newly created topics.
- Ensure each factor has a business-friendly `label`.
- Use `enumId` when factor value comes from enum code table.

## Pipeline
- Core fields and types: `pipelineId:str`, `name:str`, `topicId:str`, `type:str`, `enabled:bool`, `stages:list[PipelineStage]`.
- Trigger types: `insert`, `merge`, `insert-or-merge`, `delete`.
- Structure and types: `stages:list[PipelineStage] -> units:list[PipelineUnit] -> do:list[PipelineAction]`.
- PipelineStage: `stageId:str`, `name:str|None`, `conditional:bool|None`, `on:dict|None`, `units:list[PipelineUnit]`.
- PipelineUnit: `unitId:str`, `name:str|None`, `conditional:bool|None`, `on:dict|None`, `do:list[PipelineAction]`.
- PipelineAction common fields: `actionId:str`, `type:str`, optional `topicId:str`, `mapping:list[dict]`, `condition:dict`, `into:dict`.
- Current CLI pipeline sync uses YAML endpoints (with fallback to JSON for legacy `pipeline/import`).

## Ingestion
- Module model:
  - Core fields and types: `moduleId:str`, `moduleName:str`, `tenantId:str|None`, `description:str|None`.
- Model config:
  - Core fields and types: `modelId:str`, `modelName:str`, `moduleId:str`, `tenantId:str|None`.
- Table config:
  - Core fields and types: `configId:str`, `name:str`, `modelName:str`, `tenantId:str|None`.
- Ingestion relation types: `module(1) -> model(N) -> table config(N)`.

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
  - Core fields and types: `id:str`, `name:str`, `type:str`, `label:str|None`, `description:str|None`, `filter:dict|None`, `category:str|None`, `topicId:str|None`.
  - Metric type candidates: `SIMPLE`, `RATIO`, `CUMULATIVE`, `DERIVED`.
  - Common metric expression shape: `type:str`, `measure:str|None`, `numerator:str|None`, `denominator:str|None`, `window:str|None`.
  - YAML endpoints: `/metricflow/metric/name/yaml`, `/metricflow/metric/yaml`
