---
name: agent-cli
description: Synchronizes Watchmen metadata (topic/pipeline/enum/semantic/metric/ingest) via CLI+REST. Invoke for init, pull/push, list-remote, pull by name/id, and YAML sync.
---

# Agent CLI for Watchmen

This skill is a thin orchestration layer for `agent-cli`.
Keep this file concise and load detailed references only when needed.

## Skill Layout
- `SKILL.md`: invocation rules and execution flow.
- `references/`: command catalog, dependency model, troubleshooting, source-of-truth notes.
- `assets/`: reusable templates and examples.

## When To Invoke
- User asks to initialize CLI vault/config.
- User asks to pull/push Topic, Pipeline, Enum, Semantic Model, Metric, or Ingestion configs.
- User asks to list remote metadata or pull data sources.
- User asks to pull by name/id, or push local YAML files.
- User asks to create a raw topic from a collector model (generate Topic YAML from Ingestion model).
- **IMPORTANT**: Before creating or modifying any Pipeline, you MUST read `references/pipeline-development.md` first.

## Install ClI and Init 
1. Ensure CLI is installed:
   - Follow `references/cli-install-guide.en.md` for detailed install instructions.
2. Ensure vault config exists (`init` first if missing):
   - `agent-cli init --vault <vault> --host <host> --pat <token>`
3. Prefer module entrypoint for compatibility:
   - `poetry run python -m agent_cli ...`
4. For names containing spaces, enforce quotes:
   - `"Policy Admin System"`

## Token Optimization Rules
- **Precise YAML Reading**: For files > 50 lines, NEVER use full-file `Read`. Use `Grep` to locate keys (e.g., factor names) and `Read` with `offset/limit` to fetch specific chunks.
- **Incremental Edits**: Always prefer `SearchReplace` over `Write` for large YAMLs to minimize the data sent in the diff.
- **Discovery First**: Use `agent-cli topic list-remote` to find IDs/names instead of pulling all files.
- **Context Management**: Once a metadata ID is found, store it in your internal thought process and avoid re-querying or re-reading the source.

## File Naming Conventions
- Local files MUST follow the `{name}__{id}.yml` pattern (e.g. `customer_360_wide__1486457832676011008.yml`).
- Use double underscores `__` to separate the business name and the internal ID.
- Refer to `references/source-of-truth.md` for specific directory structures per entity type.

## Pipeline Update Rules (CRITICAL)
- ** NEVER create duplicate pipelines** - always check remote first.
- Before creating a pipeline:
  1. Run `agent-cli pipeline list-remote --vault <vault>` to check if pipeline with same name exists.
  2. If exists, set `pipelineId` to the existing pipeline ID to update it.
  3. If not exists, use `pipelineId: null` to create new.
- When updating an existing pipeline, ensure local file is named with the correct existing ID.

## Topic Creation Rules (CRITICAL)
- **dataSourceId is REQUIRED** when creating any topic.
- If dataSourceId is unknown, ASK the user before proceeding.
- Do NOT use placeholder or fake dataSourceId values.
- When asking user, use datasource **name** not the ID.
- Run `agent-cli datasource list-remote --vault <vault>` to find available data sources.

## Topic Index Design (IMPORTANT)
- When designing a topic, always consider index design for query optimization.
- Primary/unique indexes: fields used in `by` conditions (e.g., customer_id, policy_no).
- Query indexes: fields frequently used in filters, joins, and aggregations.
- Common index candidates: business keys, foreign keys, datetime fields used in range queries.
- For aggregate topics: include group-by fields as part of the index design.
- Balance between query performance and storage overhead - not all fields need indexes.

## On-Demand Loading Rules
- Load `references/command-catalog.md` when deciding exact command/args.
- Load `references/dependency-chain.md` when deciding related entities to sync.
- Load `references/troubleshooting.md` when command fails.
- Load `references/source-of-truth.md` when generating or validating YAML/JSON payloads.
- Load `references/pipeline-development.md` when user asks to build/modify pipeline logic.
- Load `references/pipeline-workflow-guide.md` for pipeline creation/update workflow and naming conventions.
- Load `assets/templates/` only when user asks to generate starter content.

## Default Execution Flow
1. Identify user intent and entity type.
2. Load minimal required reference file(s).
3. Resolve prerequisites (`--vault`, auth, host).
4. Execute smallest safe command.
5. Return structured JSON result summary.
6. If failure occurs, load troubleshooting reference and retry with fix.

## Scope
- Supported entities: Topic, Pipeline, Enum, MetricFlow Semantic Model, MetricFlow Metric, Ingestion Module/Model/Table, DataSource.
- Supported actions: pull, push, list, list-remote, pull by name/id, push local YAML files, create raw topic from ingestion model.
- Protocol: YAML for topic/pipeline/enum/ingestion.
- Outputs: JSON summaries suitable for agent chaining.

## DataMo Topic Layer Architecture

DataMo topics follow a **four-layer architecture**:

| Layer | Topic Type | Description | Example |
|-------|------------|-------------|---------|
| **Bronze/Raw** | `raw` | Raw data ingestion from external systems or source databases | `source_insurance_quotation_raw`, `broker_commission_transaction` |
| **Silver/ODS** | `distinct` | Transactional data layer, maintains business event details with traceability | `policy_policy`, `quotation_main`, `claims_fnol` |
| **Gold/Domain** | `distinct` | Domain layer, aggregates business domain entities with related data | `party_individual_customer`, `customer_360_wide` |
| **Datamart** | `aggregate`/`distinct` | Data mart layer - wide tables optimized for query | `broker_commission_statement`, `quotation_premium_agg` |

### Topic Type Guidelines

| Type | Usage | Layer |
|------|-------|-------|
| `raw` | External system ingestion - raw data without schema constraints | Bronze |
| `distinct` | Unique business entity details within a domain | Silver/Gold/Datamart |
| `aggregate` | Pre-aggregated summary data for BI/reporting | Datamart |

### Topic Naming Convention by Layer

```
transformation/topics/
├── {source_system}__{id}.yml              # Raw: prefix is data source name
│   Example: source_insurance_quotation_raw__1468658271836859392.yml
│
├── {business_entity}__{id}.yml            # ODS Silver: business entity name
│   Example: policy_policy__1083070031199647744.yml
│
├── {domain_entity}__{id}.yml              # Gold Domain: domain entity name
│   Example: party_individual_customer__1083070021775046656.yml
│
└── {datamart_name}__{id}.yml              # Datamart: data mart name
    Example: broker_commission_statement__1504225603996594176.yml
```

### Pipeline Layer Patterns

| Pattern | Source Layer | Target Layer | Use Case |
|---------|--------------|--------------|----------|
| **ETL Ingestion** | External System → | Raw Topic | Data ingestion |
| **ODS Enrichment** | Raw Topic → | ODS Silver | Data cleansing, normalization |
| **Domain Aggregation** | ODS Silver → | Gold Domain | Cross-topic association and aggregation |
| **Datamart Build** | Gold/ODS → | Datamart | Business-oriented wide tables |

For detailed data layer design patterns, see `references/data-layer-architecture.md`.
