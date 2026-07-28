# Source of Truth

## Configuration
- Vault config location: `<vault>/.agent-runtime-cli/config.json`
- Config fields and types:
  - `host:str`
  - `pat:str|None`
  - `username:str|None`
  - `password:str|None`

## Authentication
- Recommended mode: PAT
- Authorization header shape:
  - `Authorization: pat <PAT>`

## Runtime Endpoints
- `GET /metricflow/health`
- `GET /metricflow/current_date`
- `GET /metricflow/list_metrics`
- `GET /metricflow/dimensions_by_metric?metric_name=<name>`
- `POST /metricflow/find_dimensions`
- `POST /metricflow/get_metric_value`
- `POST /metricflow/query_metrics`
- `GET /metricflow/ontology/list?query=<text>&pageNumber=<n>&pageSize=<n>`
- `GET /metricflow/ontology/get?ontologyId=<id>`
- `GET /metricflow/ontology/all/yaml/agent-view` (YAML text)
- `GET /metricflow/ontology/name/yaml/agent-view?name=<name>` (YAML text)
- `POST /metricflow/ontology/{ontology_id}/query`
- `POST /metricflow/ontology/{ontology_id}/query/compile`

## get_metric_value Request Shape
- `metric:str`
- `group_by:list[str]|None`
- `where:str|None`
- `start_time:str|None`
- `end_time:str|None`
- `order:list[str]|None`
- `limit:int|None`
- `time_granularity:str|None`

## query_metrics Request Shape
- Top level type: `list[dict]`
- Each item follows runtime metric query payload shape, commonly:
  - `metric:str`
  - `group_by:list[str]|None`
  - `where:str|None`
  - `start_time:str|None`
  - `end_time:str|None`
  - `order:list[str]|None`
  - `limit:int|None`
  - `time_granularity:str|None`

## ontology query Request Shape
- `virtualObjectId:str` (required; VirtualObject.id from `ontology get`)
- `filters:dict` — field name to value; scalar means equals, or `{"operator": "gte", "value": ...}`; operators: eq/ne/in/not_in/gt/gte/lt/lte/between/is_null/is_not_null; `between` value is a 2-element list
- `fields:list[str]` — attribute names to return; empty = all
- `groupBy:list[dict]` — `{field:str, granularity:day|week|month|quarter|year|None}`
- `includeDerived:list[str]` — derived attribute names to compute
- `orderBy:list[dict]` — `{field:str, direction:asc|desc}`
- `limit:int` (default 100, max 10000), `offset:int` (default 0)

## Output
- Successful commands print formatted JSON to stdout (`ontology meta` prints raw YAML).
- Errors print plain text to stderr.
