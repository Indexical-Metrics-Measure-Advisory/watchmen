# Metric Lineage Backend Design

## Background
- Frontend already ships a `Metric Lineage` page and its current contract is defined by:
  - `watchmen-analysis-client/src/model/metricLineage.ts`
  - `watchmen-analysis-client/src/services/metricLineageService.ts`
- The frontend page currently uses mock data only, but the UI contract is already stable enough to drive backend implementation.
- Backend needs to aggregate lineage across these domains:
  - Metric definition
  - Semantic model
  - Topic
  - Pipeline
  - Source table / source field
- This document is intended for backend AI-assisted implementation. The goal is to give the AI a clear target contract, boundaries, aggregation flow, and rollout strategy.


## Goals
- Provide one backend API that returns a frontend-ready lineage graph for a given metric.
- Keep frontend contract aligned with `MetricLineageViewData` so the UI does not need structural changes.
- Support complete lineage, partial lineage, and unresolved lineage states.
- Support both simple metrics and derived / ratio metrics with multiple branches.
- Support metric-on-metric dependency chains where one metric is computed from one or more other metrics.
- Make backend implementation extensible so mock data can later be replaced by real lineage assembly without changing the response shape.

## Non-Goals
- No frontend rendering redesign in this phase.
- No generic graph query engine for all Watchmen assets in this phase.
- No write-back or lineage editing capability.
- No automatic correction of broken metadata; backend only diagnoses and returns current resolvable lineage.

## Frontend Contract

### Source of Truth
- Backend response must match the contract below.
- This contract is already consumed by the frontend lineage page.

```ts
type LineageStage = 'metric' | 'semantic' | 'topic' | 'pipeline' | 'source';

type LineageNodeType =
  | 'metric'
  | 'metric_ref'
  | 'semantic_model'
  | 'semantic_measure'
  | 'topic'
  | 'topic_factor'
  | 'pipeline'
  | 'source_table'
  | 'source_field';

interface LineageNode {
  id: string;
  stage: LineageStage;
  type: LineageNodeType;
  name: string;
  label?: string;
  description?: string;
  badge?: string;
  metadata?: Record<string, unknown>;
}

interface LineageEdge {
  id: string;
  from: string;
  to: string;
  kind: 'defines' | 'maps_to' | 'reads_from' | 'derived_from' | 'produces';
  pathId: string;
}

interface LineagePath {
  id: string;
  title: string;
  nodeIds: string[];
  isPrimary?: boolean;
}

interface MetricLineageViewData {
  metricName: string;
  status: 'resolved' | 'partial' | 'unresolved';
  summary: {
    metricType: string;
    semanticModelCount: number;
    topicCount: number;
    pipelineCount: number;
    sourceFieldCount: number;
  };
  nodes: LineageNode[];
  edges: LineageEdge[];
  paths: LineagePath[];
  diagnostics?: string[];
}
```

### Contract Rules
- `metricName` is the normalized metric requested by user.
- `status` semantics:
  - `resolved`: backend resolved all intended downstream stages for at least one valid path.
  - `partial`: backend resolved some stages but at least one expected downstream stage is missing.
  - `unresolved`: backend cannot build any meaningful lineage path.
- `nodes` is the de-duplicated node set for the whole graph.
- `edges` is the de-duplicated relation set for the whole graph.
- `paths` is the user-facing path view; it is not optional even if nodes and edges exist.
- `diagnostics` should explain why lineage is partial or unresolved.
- `metric_ref` is a first-class node type, not just metadata on the main metric.
- Frontend page must support metric dependency chains such as:
  - `metric -> metric_ref -> semantic -> topic -> pipeline -> source`
  - `metric -> metric_ref -> metric_ref -> ...`

## Metric Depends On Metric

### Core Concept
- A metric can be directly sourced from semantic metadata, or it can be computed from one or more other metrics.
- Therefore lineage cannot assume that the first downstream step after a metric is always a semantic measure.
- Backend must explicitly model referenced metrics as graph nodes and relations, instead of flattening them into one metric record.

### Backend Modeling Rule
- Requested metric is represented as `type=metric`.
- Every metric used by the requested metric formula is represented as `type=metric_ref`.
- Relationship between them is represented as `kind=derived_from`.
- Each referenced metric can continue to resolve into:
  - another referenced metric
  - semantic model
  - semantic measure
  - topic / pipeline / source

### Frontend Rendering Requirement
- The page must render metric dependency nodes inside the `metric` stage before entering the semantic stage.
- The page must allow more than one metric-level node in a single path.
- The page must not collapse all referenced metrics into one comma-separated label, because each referenced metric may have its own missing semantic mapping and its own downstream branch.

## API Design

### Endpoint
- `GET /metricflow/metrics/lineage`

### Query Parameters
- `metric`: required, metric name
- `tenantId`: optional at HTTP layer if already derived from auth context, otherwise required by backend service
- `includeDiagnostics`: optional, default `true`

### Response
- `200 OK` with `MetricLineageViewData`

### Example Request
```http
GET /metricflow/metrics/lineage?metric=loss_ratio
```

### Example Response
```json
{
  "metricName": "loss_ratio",
  "status": "resolved",
  "summary": {
    "metricType": "ratio",
    "semanticModelCount": 2,
    "topicCount": 2,
    "pipelineCount": 2,
    "sourceFieldCount": 3
  },
  "nodes": [
    {
      "id": "metric-loss-ratio",
      "stage": "metric",
      "type": "metric",
      "name": "loss_ratio",
      "label": "Loss Ratio",
      "badge": "ratio",
      "metadata": {
        "numerator": "claims_paid_amount",
        "denominator": "earned_premium_amount"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "from": "metric-loss-ratio",
      "to": "metric-ref-claims-paid",
      "kind": "derived_from",
      "pathId": "path-numerator"
    }
  ],
  "paths": [
    {
      "id": "path-numerator",
      "title": "Numerator lineage",
      "nodeIds": [
        "metric-loss-ratio",
        "metric-ref-claims-paid",
        "semantic-claims-finance",
        "topic-claims-finance",
        "pipeline-claims-finance",
        "source-field-paid-amount"
      ],
      "isPrimary": true
    }
  ],
  "diagnostics": [
    "Resolved from metric, semantic, topic, pipeline and source metadata."
  ]
}
```

## High-Level Backend Architecture

### Recommended Layers
- `rest layer`
  - Validate request
  - Resolve tenant context
  - Return `MetricLineageViewData`
- `service layer`
  - Orchestrate lineage assembly
  - Control caching, diagnostics, and status classification
- `resolver layer`
  - Resolve metric metadata
  - Resolve semantic model mapping
  - Resolve topic dependency
  - Resolve pipeline dependency
  - Resolve source lineage
- `assembler layer`
  - Build nodes, edges, paths
  - Deduplicate graph elements
  - Build summary and diagnostics

### Recommended Modules
- `metric_lineage_router.py`
- `metric_lineage_service.py`
- `metric_lineage_resolver.py`
- `metric_lineage_assembler.py`
- `metric_lineage_models.py`

## Data Flow

### End-to-End Resolution Flow
1. Receive `metric`.
2. Normalize metric name.
3. Load metric definition.
4. Determine metric type:
   - simple
   - derived
   - ratio
   - unknown
5. Resolve direct metric lineage or referenced metric branches.
6. If referenced metrics exist, recursively resolve each referenced metric branch before semantic resolution.
7. For each terminal metric branch, resolve semantic model and semantic measure.
8. Resolve mapped topic and topic factor.
9. Resolve pipeline definitions related to topic or downstream physicalization.
10. Resolve source tables and source fields from pipeline metadata.
11. Build graph:
    - nodes
    - edges
    - paths
12. Build summary counts.
13. Classify `status`.
14. Return frontend-ready response.

## Domain Mapping Rules

### Stage Mapping
- `metric`
  - business metric
  - referenced metric in derived formulas
  - nested metric dependencies in multi-level formulas
- `semantic`
  - semantic model
  - semantic measure
- `topic`
  - topic
  - topic factor
- `pipeline`
  - pipeline definition
- `source`
  - source table
  - source field

### Node Type Mapping
- Main metric maps to `type=metric`.
- Referenced metric inside formula maps to `type=metric_ref`.
- Semantic model maps to `type=semantic_model`.
- Metric-resolved semantic measure maps to `type=semantic_measure`.
- Topic maps to `type=topic`.
- Topic factor maps to `type=topic_factor`.
- Pipeline maps to `type=pipeline`.
- Physical table maps to `type=source_table`.
- Physical column maps to `type=source_field`.

### Edge Type Mapping
- `derived_from`
  - metric to metric reference
- `defines`
  - metric or metric reference to semantic model / semantic measure
- `maps_to`
  - semantic to topic
  - topic to factor
  - source table to source field
- `reads_from`
  - topic or factor to pipeline
- `produces`
  - pipeline to source table

## Path Construction Rules

### Primary Path
- Always choose one primary path if at least one path exists.
- Selection priority:
  1. longest valid path
  2. path with complete downstream resolution
  3. first deterministic branch by sorted key

### Branch Paths
- Derived metrics may have multiple branch paths.
- Ratio metrics should usually expose:
  - numerator path
  - denominator path
- Metric dependency chains should expose one path per referenced metric branch when the requested metric depends on multiple metrics.
- If one referenced metric itself depends on another metric, the path may contain multiple consecutive `metric` stage nodes.
- Each path must contain ordered `nodeIds` from metric to terminal source node.

### Path Constraints
- `paths` should not contain duplicate path ids.
- `pathId` on every edge must reference an existing path.
- A node may belong to multiple paths.

## Status Classification

### `resolved`
- At least one path reaches intended terminal source lineage.
- Required node groups exist:
  - metric
  - semantic
  - topic
  - pipeline
  - source

### `partial`
- Metric exists and at least one downstream stage resolves.
- But one or more expected stages are missing.
- Example:
  - metric -> semantic -> topic found
  - pipeline or source not found

### `unresolved`
- Metric not found, or
- Metric found but no graph/path can be built.

## Diagnostics Strategy
- Diagnostics are for operator and AI debugging, not only end user.
- Recommended messages:
  - metric not found
  - referenced metric found but semantic measure missing
  - semantic mapping missing
  - topic not found
  - topic factor missing
  - pipeline missing
  - source field lineage unavailable
  - multiple branches merged
- Keep messages deterministic and concise.

### Diagnostics Semantics for Metric Dependencies
- Diagnostics must identify whether the missing metadata belongs to:
  - the requested metric
  - a referenced metric
- Example:
```json
"diagnostics": [
  "Semantic measure[female_insured_claims_count] was not found in semantic metadata.",
  "Semantic measure[total_claim_cases] was not found in semantic metadata."
]
```
- The example above means the requested metric depends on other metrics, and those referenced metrics could not be mapped to semantic measures.
- Backend must still return the metric dependency nodes even when semantic metadata is missing for referenced metrics.
- In this case:
  - `metric` and `metric_ref` nodes should still be returned
  - unresolved downstream semantic/topic/pipeline/source nodes may be omitted
  - overall status should usually be `partial`, not `unresolved`, if the metric dependency chain itself is known

## Summary Field Rules
- `metricType`
  - derived from metric definition
  - fallback to `unknown`
- `semanticModelCount`
  - unique count of `semantic_model`
- `topicCount`
  - unique count of `topic`
- `pipelineCount`
  - unique count of `pipeline`
- `sourceFieldCount`
  - unique count of `source_field`

## Identifier Rules
- All ids must be stable and deterministic across identical requests.
- Recommended id pattern:
  - `metric-{metric_name}`
  - `metric-ref-{metric_name}`
  - `semantic-{model_name}`
  - `semantic-measure-{measure_name}`
  - `topic-{topic_name}`
  - `topic-factor-{factor_name}`
  - `pipeline-{pipeline_name}`
  - `source-table-{qualified_table_name}`
  - `source-field-{qualified_table_name}-{field_name}`
- Avoid random UUIDs in response ids because frontend selection state and cache benefit from stable ids.

## Suggested Backend Sources

### Metric Source
- Metric definitions from metric management metadata.
- Must include:
  - metric name
  - display label
  - description
  - formula / expression
  - referenced metrics
  - metric type

### Semantic Source
- Semantic model metadata.
- Must include:
  - semantic model id / name
  - measure name
  - metric to measure mapping
  - linked topic id

### Topic Source
- Topic metadata.
- Must include:
  - topic id / name
  - factors
  - factor-to-source mapping if available

### Pipeline Source
- Pipeline metadata.
- Must include:
  - pipeline id / name
  - source topic or downstream table relationship
  - output table info
  - lineage to source table / field if available

### Source Lineage Source
- Pipeline-level or data asset-level metadata.
- Must include:
  - table name
  - field name
  - optional data type / nullability / schema / database

## Service Contract for AI Implementation

### Recommended Service Signature
```python
class MetricLineageService:
    def get_metric_lineage(self, metric_name: str, tenant_id: str) -> dict:
        ...
```

### Internal Resolver Signature
```python
class MetricLineageResolver:
    def resolve_metric(self, metric_name: str, tenant_id: str): ...
    def resolve_metric_dependencies(self, metric_meta, tenant_id: str): ...
    def resolve_semantic(self, metric_meta, tenant_id: str): ...
    def resolve_topic(self, semantic_meta, tenant_id: str): ...
    def resolve_pipeline(self, topic_meta, tenant_id: str): ...
    def resolve_source(self, pipeline_meta, tenant_id: str): ...
```

### Internal Assembler Signature
```python
class MetricLineageAssembler:
    def add_node(self, node): ...
    def add_edge(self, edge): ...
    def add_path(self, path): ...
    def build(self) -> dict: ...
```

## AI Coding Instructions

### Must Follow
- Treat `MetricLineageViewData` as the response source of truth.
- Keep API response frontend-ready; do not require frontend to join multiple backend payloads.
- Use deterministic ids and sorted output where possible.
- Preserve branch paths for ratio / derived metrics.
- Preserve metric-to-metric dependency chains as explicit nodes and edges.
- Return `partial` instead of failing hard when downstream metadata is missing.
- Put detailed failures into `diagnostics`.

### Avoid
- Do not return raw backend entities directly.
- Do not make frontend infer stages from arbitrary backend names.
- Do not couple implementation to current mock metric names.
- Do not use non-deterministic ordering.

## Error Handling
- `400`
  - missing or blank metric
- `404`
  - optional choice if metric not found, but recommended to still return `200` with `status=unresolved` for UI simplicity
- `500`
  - only for actual service failure

### Recommended Response for Unknown Metric
```json
{
  "metricName": "unknown_metric",
  "status": "unresolved",
  "summary": {
    "metricType": "unknown",
    "semanticModelCount": 0,
    "topicCount": 0,
    "pipelineCount": 0,
    "sourceFieldCount": 0
  },
  "nodes": [],
  "edges": [],
  "paths": [],
  "diagnostics": [
    "Metric not found.",
    "No lineage graph could be assembled."
  ]
}
```

## Performance Considerations
- Cache lineage result by `tenantId + metricName` for short TTL.
- Cache intermediate metadata lookups:
  - metric definitions
  - semantic models
  - topics
  - pipelines
- Use batched fetches when resolving multi-branch metrics.
- Avoid recursive N+1 metadata loading across branches.

## Observability
- Add structured logs for:
  - metric requested
  - metric type resolved
  - number of paths built
  - unresolved stages
  - final status
- Add metrics:
  - lineage request count
  - unresolved rate
  - partial rate
  - average assembly latency

## Security and Tenant Isolation
- Every metadata query must be tenant-scoped.
- Never merge cross-tenant metadata in one lineage graph.
- If using cached lineage, cache key must include tenant id.

## Rollout Plan
1. Implement backend API with mock-compatible response shape.
2. Validate against frontend using existing sample metrics:
   - `total_claim_cases`
   - `loss_ratio`
   - `claim_risk_score`
   - `underwriting_margin`
3. Switch frontend service from internal mock provider to HTTP provider.
4. Keep unresolved / partial fallback behavior during metadata completion period.
5. Add integration tests for simple, derived, ratio, and missing-metadata cases.

## Acceptance Criteria
- Frontend `Metric Lineage` page works without changing `MetricLineageViewData`.
- Simple metrics produce one resolved primary path when metadata is complete.
- Ratio / derived metrics produce multiple paths where applicable.
- Metrics that depend on other metrics render explicit `metric_ref` nodes and keep those nodes visible even when semantic mapping is missing.
- Missing downstream metadata returns `partial` plus diagnostics.
- Missing metric returns `unresolved` with empty graph.
- Response ordering and ids remain stable across repeated requests.
