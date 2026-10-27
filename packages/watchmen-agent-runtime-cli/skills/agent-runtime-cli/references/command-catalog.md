# Command Catalog

## Core
- `init --vault --host --pat`
- `config --vault`
- `discover`
- `health --vault`
- `date --vault`

## Metrics
- `metrics list --vault`
- `metrics dimensions <metric_name> --vault`
- `metrics find-dimensions --metrics <comma-separated-metrics> --vault`
- `metrics value <metric_name> --group-by --where --start-time --end-time --order --limit --time-granularity --vault`
- `metrics query-file <file_path> --vault`

## Ontology
- `ontology list --query --page --size --vault`
- `ontology meta --name --vault`
- `ontology get <ontology_id> --vault`
- `ontology query <ontology_id> --virtual-object --filters --fields --group-by --include-derived --order-by --limit --offset --file --vault`
- `ontology compile <ontology_id> --virtual-object --filters --fields --group-by --include-derived --order-by --limit --offset --file --vault`

## Eval
- `eval run <file_path> --vault`
- `eval log [--correlation-id <id>] [--limit N] --vault`

## Usage Notes
- `--group-by` accepts comma-separated dimension names.
- `--order` accepts comma-separated order fields.
- `--metrics` accepts comma-separated metric names.
- `metrics query-file` expects a top-level JSON array.
- `ontology meta` prints agent-view YAML (business names only, no internal IDs); pass `--name` for a single ontology or omit for all.
- `ontology list` returns a paged JSON result including ontology IDs; `ontology get` returns full JSON including virtual object/link IDs.
- `ontology query` requires `--virtual-object` (VirtualObject.id from `ontology get`), unless `virtualObjectId` is given in `--file`.
- `--filters` is a JSON object: scalar values mean equals, or `{"operator": "gte", "value": ...}`; operators: eq/ne/in/not_in/gt/gte/lt/lte/between/is_null/is_not_null.
- Ontology `--group-by` accepts `field` or `field:granularity` (day/week/month/quarter/year).
- Ontology `--order-by` accepts `field` or `field:asc|desc`.
- `ontology compile` accepts the same arguments as `ontology query` and returns the compiled SQL preview without executing.
- All data-plane commands accept `--correlation-id`. `eval run` generates `eval-<runId>-<questionId>` per question, writes `<vault>/eval-reports/report-<runId>.md`, and exits 0 only when all questions pass (2 otherwise).
- `eval log` reads the local runtime call ledger; it does not read `agent-cli` Collector logs or fix plans.

## Agent Query Flow (ontology)
1. `ontology list` (or `ontology meta`) to discover ontologies and their business objects.
2. `ontology get <ontology_id>` to fetch the full graph JSON and pick the target `VirtualObject.id` and attribute names.
3. `ontology query <ontology_id> --virtual-object <id> --filters ... --fields ...` to fetch business data rows.
4. Use `ontology compile` with the same arguments to inspect the generated SQL when debugging.

## Post-Collector Handoff
1. Receive the Collector `eventTriggerId`, Pipeline `traceId` values, source `correlationId`, diagnosis, and repair outcome as external context from `agent-cli`; do not pass them as Metric/Ontology query identifiers.
2. Configure the runtime vault separately, check `health`, and use `metrics` or `ontology` commands to validate the affected business results.
3. Encode repeatable correctness checks as a golden question set and run `eval run <file_path>`.
4. Use the generated eval correlation IDs with `eval log`, and return the report path and pass/fail result. Return to `agent-cli` only if further Collector operational work is needed.
