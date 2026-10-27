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

## Eval and Local Evidence
- Data-plane calls append JSON lines to `<vault>/.agent-runtime-cli/query-log.jsonl`; `eval log` reads this runtime ledger.
- `eval run` executes local golden-set orchestration over Metric and Ontology queries. Each question receives `eval-<runId>-<questionId>` as its correlation ID.
- Reports are written to `<vault>/eval-reports/report-<runId>.md`. Exit code 0 means all questions passed; exit code 2 means at least one failed.
- Runtime `correlationId` groups runtime calls. It is not a Collector `eventTriggerId` or Pipeline `traceId`; the latter two arrive only as external handoff context from `agent-cli`.

## Collector Handoff Boundary
- `agent-cli` owns Collector triggers, diagnosis, fix plans, and guarded retries. This CLI owns subsequent Metric/Ontology queries and eval; it does not execute Collector repair or read Collector fix plans.
- Preserve Collector event/trace/correlation identifiers and diagnosis as handoff evidence, but resolve Metric names, Ontology IDs, and VirtualObject IDs through this CLI before querying.
- The runtime vault and query ledger are separate from the `agent-cli` vault and ledger. Eval generates its own correlation IDs rather than inheriting the Collector correlation ID.
- This handoff does not imply a unified Durable Runtime, Lambda support, general LLM automatic repair, or cross-resource atomic builds.
