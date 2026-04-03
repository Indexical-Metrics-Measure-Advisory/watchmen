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

## Output
- Successful commands print formatted JSON to stdout.
- Errors print plain text to stderr.
