# Metric Lineage Backend Development Guide

## Purpose
- This document is the implementation guide for backend development of Metric Lineage.
- It complements `metric-lineage-backend-design.md` instead of replacing it.
- `metric-lineage-backend-design.md` remains the response-contract and product-intent source of truth.
- This guide focuses on current repository structures, feasible resolver logic, implementation boundaries, and coding order.

## Relationship To Existing Design
- Keep the frontend response aligned with `watchmen-analysis-client/src/model/metricLineage.ts`.
- Keep API shape aligned with `MetricLineageViewData`.
- Treat this guide as the "how to implement against the current codebase" document.

## Current Repository Reality

### Frontend Contract
- Frontend lineage contract already exists in `watchmen-analysis-client/src/model/metricLineage.ts`.
- The backend must return:
  - `metricName`
  - `status`
  - `summary`
  - `nodes`
  - `edges`
  - `paths`
  - optional `diagnostics`

### Metric Metadata
- Metric model lives in `watchmen-metricflow/src/watchmen_metricflow/model/metrics.py`.
- Metric persistence service lives in `watchmen-metricflow/src/watchmen_metricflow/meta/metrics_meta_service.py`.
- Important fields:
  - `name`
  - `label`
  - `description`
  - `type`
  - `type_params`
  - `filter`
  - `metadata`
- Current lineage-relevant metric references are inside `type_params`:
  - simple metric: `type_params.measure`
  - ratio metric: `type_params.numerator`, `type_params.denominator`
  - derived metric: `type_params.metrics`
  - metric-on-metric chain fallback: nested referenced metric may again resolve to `measure`, `numerator`, `denominator`, or another `metrics[]`
  - expression hint: `type_params.expr`

### Semantic Metadata
- Semantic model lives in `watchmen-metricflow/src/watchmen_metricflow/model/semantic.py`.
- Semantic persistence service lives in `watchmen-metricflow/src/watchmen_metricflow/meta/semantic_meta_service.py`.
- Important fields:
  - `name`
  - `measures`
  - `dimensions`
  - `entities`
  - `topicId`
  - `sourceType`
  - `node_relation`
- Current semantic model already provides two critical lineage links:
  - semantic measure resolution via `measures[]`
  - semantic-to-topic link via `topicId`
- `node_relation` is the most stable current source-table level metadata.

### Topic Metadata
- Topic model lives in `watchmen-model/src/watchmen_model/admin/topic.py`.
- Topic service lives in `watchmen-meta/src/watchmen_meta/admin/topic_service.py`.
- Current topic fields useful for lineage:
  - `topicId`
  - `name`
  - `factors`
  - `dataSourceId`
- Current topic model does not provide a dedicated physical source lineage mapping.
- Topic stage is still valuable because it provides:
  - topic node
  - topic factor nodes

### Pipeline Metadata
- Pipeline model lives in `watchmen-model/src/watchmen_model/admin/pipeline.py`.
- Pipeline service lives in `watchmen-meta/src/watchmen_meta/admin/pipeline_service.py`.
- Current pipeline structure stores dependency logic in:
  - `stages`
  - `units`
  - `actions`
- Pipeline lineage is not a flat metadata mapping.
- It must be resolved by parsing actions in stage/unit trees.

### Existing Lineage Utilities
- There is already reusable lineage parsing logic in `watchmen-lineage`.
- The most important existing reference is:
  - `watchmen-lineage/src/watchmen_lineage/service/builder/pipeline_lineage.py`
- That module already proves the current codebase can parse:
  - read topic actions
  - read factor actions
  - write topic actions
  - factor mapping relations
  - parameter-driven dependencies

## Practical Backend Strategy

### Main Principle
- Use current repository metadata as-is.
- Do not wait for a perfect generic lineage engine.
- Build a metric-lineage-specific orchestration layer that resolves:
  - metric branch and recursive metric_ref chain
  - semantic model / measure
  - topic / topic factor
  - pipeline / factor mapping relation
  - source table / source field

### Recommended Resolution Order
1. Resolve metric by name.
2. Expand branches from metric type.
3. If branch references another metric, recursively expand that referenced metric first and append it into a `metric_ref` chain.
4. Stop recursion when a terminal branch yields a concrete measure reference.
5. Resolve semantic model and semantic measure for each terminal branch.
6. Resolve topic from semantic model `topicId`.
7. Resolve topic factor from measure expression or matched names when possible.
8. Resolve related pipelines by topic.
9. Parse pipeline actions and mapping logic to find factor dependencies.
10. Resolve source table and source field.
11. Build nodes, edges, paths, summary, diagnostics.

## What Is Actually Resolvable Today

### Strongly Resolvable
- Metric node and metric references.
- Multi-level metric_ref chains such as `metric -> metric_ref -> metric_ref`.
- Semantic model node.
- Semantic measure node.
- Topic node.
- Topic factor node.
- Pipeline node.
- Pipeline-to-factor dependency based on action/mapping parsing.
- Source table based on semantic `node_relation`.

### Partially Resolvable
- Source field:
  - can be approximated from semantic measure `expr`
  - can be refined by pipeline mapping if the action graph is explicit enough
- Topic factor mapping:
  - can be inferred in some cases from semantic measure name or expression
  - may require fallback diagnostics when explicit factor linkage is missing

### Not Reliably Resolvable Today
- Full physical-table lineage from pipeline only.
- Universal factor-to-source mapping from topic metadata only.
- Arbitrary SQL-grade field lineage across all actions without fallback rules.

## Real Mapping Rules

### Metric To Branch
- `simple`
  - use `metric.type_params.measure`
- `ratio`
  - create two branches:
    - numerator
    - denominator
  - use `metric.type_params.numerator`
  - use `metric.type_params.denominator`
- `derived`
  - create one branch per `metric.type_params.metrics[]`
  - referenced metrics become ordered `metric_ref` nodes in the path
- nested metric dependency
  - when a referenced metric is itself `derived`, `ratio`, `conversion`, or `cumulative`, keep expanding until a terminal measure branch is found
  - each referenced metric name in that chain must remain visible as an explicit `metric_ref` node
- `conversion` and `cumulative`
  - keep contract-compatible support
  - first try terminal measure extraction from `measure`
  - if absent, fallback to first `input_measures[]`
  - classify as partial when full downstream mapping is not available

### Branch To Semantic
- Current repository does not store direct `metric -> semanticModelId`.
- Resolve semantic by scanning semantic models and matching branch measure names against `semantic_model.measures[].name`.
- Semantic resolution starts only after the metric_ref chain has been fully expanded to a terminal measure.
- If semantic metadata is missing for the terminal measure:
  - keep the already resolved metric and metric_ref nodes
  - omit unresolved downstream semantic/topic/pipeline/source nodes
  - return `partial` instead of collapsing the whole path to `unresolved`

### Semantic To Topic
- Use `semantic_model.topicId`.
- If `topicId` is missing:
  - keep semantic node
  - return `partial`
  - append diagnostics

### Topic To Pipeline
- Resolve pipelines whose `pipeline.topicId` equals resolved topic id.
- Only enabled pipelines should be considered primary candidates.
- If multiple pipelines exist:
  - include all relevant ones in graph
  - choose one deterministic primary path

### Pipeline To Factor Dependency
- Parse `stages -> units -> actions`.
- Reuse parsing ideas from `watchmen-lineage`.
- Important action families:
  - read actions
  - write topic actions
  - write factor actions
  - mapping row actions
- The pipeline stage in metric lineage should be treated as a factor-dependency resolver, not only as a label node.

### Source Resolution
- Primary current source-table source:
  - `semantic_model.node_relation`
- Primary current source-field source:
  - semantic measure `expr`
- Pipeline parsing can refine factor dependencies, but should not be the only source fallback for physical source nodes in phase one.

## Recommended Output Semantics

### Nodes
- `metric`
  - root business metric
- `metric_ref`
  - referenced metric in derived or nested metric dependency branch
  - keep one node per referenced metric hop, do not collapse to comma-separated metadata
- `semantic_model`
  - matched semantic model
- `semantic_measure`
  - matched measure in that semantic model
- `topic`
  - resolved topic
- `topic_factor`
  - factor aligned to the branch when resolvable
- `pipeline`
  - pipeline related to topic or branch factor
- `source_table`
  - semantic `node_relation.relation_name`
- `source_field`
  - semantic measure expression or normalized field representation

### Edges
- `derived_from`
  - metric -> metric_ref
  - metric_ref -> metric_ref when dependency nesting continues
- `defines`
  - metric or metric_ref -> semantic_model
  - semantic_model -> semantic_measure
- `maps_to`
  - semantic_model -> topic
  - topic -> topic_factor
  - source_table -> source_field
- `reads_from`
  - topic_factor -> pipeline
  - topic -> pipeline when factor granularity is unavailable
- `produces`
  - pipeline -> source_table only when pipeline metadata explicitly supports such a relation

## Recommended Module Layout
- `watchmen-metricflow/src/watchmen_metricflow/lineage/metric_lineage_models.py`
- `watchmen-metricflow/src/watchmen_metricflow/lineage/metric_lineage_assembler.py`
- `watchmen-metricflow/src/watchmen_metricflow/lineage/metric_lineage_resolver.py`
- `watchmen-metricflow/src/watchmen_metricflow/lineage/metric_lineage_service.py`
- `watchmen-metricflow/src/watchmen_metricflow/router/metric_lineage_router.py`

## Recommended Class Responsibilities

### `metric_lineage_models.py`
- Request-independent Pydantic models for:
  - lineage node
  - lineage edge
  - lineage path
  - final response
- Keep field names exactly aligned with frontend contract.

### `metric_lineage_assembler.py`
- Add node with deduplication.
- Add edge with deduplication.
- Add path with deterministic ordering.
- Build summary counts.
- Build final `status`.
- Build diagnostics.

### `metric_lineage_resolver.py`
- Own metadata loading and branch resolution.
- Suggested public methods:
  - `resolve_metric(metric_name, tenant_id)`
  - `resolve_metric_branches(metric_meta, tenant_id)`
  - `resolve_semantic_for_branch(branch, tenant_id)`
  - `resolve_topic(semantic_meta, tenant_id)`
  - `resolve_pipelines(topic_meta, tenant_id)`
  - `resolve_pipeline_factor_dependencies(pipelines, branch, tenant_id)`
  - `resolve_source(semantic_meta, measure_meta)`

### `metric_lineage_service.py`
- Orchestrate end-to-end lineage assembly.
- Apply tenant scoping.
- Apply caching.
- Return final frontend-ready response.

### `metric_lineage_router.py`
- Validate request.
- Resolve principal tenant.
- Call service.
- Return contract payload.

## Development Sequence

### Phase 1: Stable Skeleton
1. Create response models.
2. Create assembler.
3. Create router.
4. Create service.
5. Create resolver with minimal real metadata support:
   - metric
   - semantic
   - topic
   - pipeline list
   - semantic-based source fallback

### Phase 2: Pipeline Factor Enrichment
1. Parse pipeline action trees.
2. Reuse logic patterns from `watchmen-lineage`.
3. Refine `topic_factor -> pipeline` edges.
4. Improve branch path specificity.

### Phase 3: Diagnostics and Caching
1. Add deterministic diagnostics.
2. Cache by `tenantId + metricName`.
3. Add structured logging and metrics.

## Resolver Design Details

### Branch Model Recommendation
- Internally define a branch object with:
  - `branch_id`
  - `branch_title`
  - `branch_kind`
  - `metric_ref_name`
  - `metric_ref_chain`
  - `measure_name`
  - `is_primary_candidate`
- `metric_ref_chain` should preserve the ordered hop list from requested metric to terminal metric.
- For derived metrics, each nested branch inherits and extends the upstream `metric_ref_chain`.
- For ratio metrics, recommended branch ids remain deterministic:
  - `primary-numerator`
  - `primary-denominator`
- For nested derived references, append a stable suffix such as `ref-1`, `ref-2`.

### Semantic Matching Rule
- Prefer exact measure-name match.
- If multiple semantic models contain the same measure name:
  - sort by semantic model name
  - keep deterministic selection
  - include diagnostics if ambiguity remains

### Topic Factor Matching Rule
- Preferred:
  - exact factor name match to measure name when business naming aligns
- Secondary:
  - infer from measure expression if expression is a direct field reference
- Fallback:
  - keep topic node only
  - mark partial with diagnostics

### Pipeline Matching Rule
- Start with all pipelines of the topic.
- Then refine by parsing action mappings for the target factor.
- If none can be linked to the factor:
  - keep topic-level pipeline relation if pipeline belongs to the topic
  - mark as partial for factor-level lineage

## Status Classification For Current Codebase

### `resolved`
- At least one branch reaches:
  - metric
  - semantic
  - topic
  - pipeline
  - source
- Source may be satisfied by semantic `node_relation + measure expr`.

### `partial`
- Metric exists.
- At least one downstream stage exists.
- But one or more of these are missing:
  - semantic model
  - topic
  - factor
  - pipeline
  - source field

### `unresolved`
- Metric cannot be found, or
- Branch expansion yields no meaningful lineage graph.

## Diagnostics Recommendations
- `Metric not found.`
- `Referenced metric could not be resolved.`
- `Semantic measure was not found in semantic metadata.`
- `Semantic model exists but topicId is missing.`
- `Topic factor could not be matched for measure.`
- `No related pipeline was found for topic.`
- `Pipeline exists but no factor-level mapping was resolved.`
- `Source table resolved from semantic model only.`
- `Source field resolved from semantic measure expression only.`
- When metric dependencies are involved, diagnostics should identify the missing measure or metadata on the terminal branch, but the response should still preserve the resolved metric_ref chain.

## Suggested Primary Path Policy
- For simple metric:
  - choose the single branch
- For ratio metric:
  - choose numerator as primary by default
  - denominator is secondary unless business says otherwise
- For derived metric:
  - choose the first deterministic primary candidate branch
  - when multiple branches are equally valid, prefer the longest fully resolved referenced branch

## API Recommendation
- Endpoint:
  - `GET /metricflow/metrics/lineage`
- Query:
  - `metric`
  - optional `includeDiagnostics`
- Tenant:
  - derive from principal service
- Response:
  - always return `200`
  - use `status=unresolved` instead of `404` for UI simplicity

## Testing Recommendation

### Unit Tests
- branch expansion
- semantic model matching
- topic resolution
- source fallback resolution
- status classification
- deterministic ids

### Integration Tests
- simple metric with complete semantic/topic/pipeline/source path
- ratio metric with numerator and denominator paths
- derived metric with referenced metric branches
- missing semantic mapping
- missing topic
- missing pipeline
- missing source field

## Coding Notes For AI-Assisted Implementation
- Do not return raw `Metric`, `SemanticModel`, `Topic`, or `Pipeline` entities.
- Normalize all graph ids deterministically.
- Sort nodes, edges, and paths before returning.
- Prefer partial output over hard failure.
- Reuse existing service classes:
  - `MetricService`
  - `SemanticModelService`
  - `TopicService`
  - `PipelineService`
- Reuse parsing ideas from `watchmen-lineage` instead of inventing a second incompatible action parser.

## Deliverable Definition
- A first backend version is considered ready when:
  - frontend can call the endpoint without changing `MetricLineageViewData`
  - simple metric works with real metric and semantic metadata
  - ratio and derived metrics return multi-branch paths
  - topic and pipeline stages are represented using current repository metadata
  - source stage is available at least through semantic fallback
  - unresolved stages return deterministic diagnostics instead of exceptions
