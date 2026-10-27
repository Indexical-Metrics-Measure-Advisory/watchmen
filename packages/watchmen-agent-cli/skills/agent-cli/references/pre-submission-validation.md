# Pre-Submission Validation Guide

Before pushing any YAML to remote, always validate locally to avoid errors and unnecessary API calls.

---

## Pre-Creation Checks: Check Local + Remote First (CRITICAL)

Before creating **any** new entity, ALWAYS check both local filesystem and remote to see if it already exists. If a matching entity is found, **update** it instead of creating a duplicate.

### Step 1: Check Local Filesystem First

Search the vault directory for existing YAML files matching the entity name:

```bash
# Check for existing local files by name pattern
ls vault/transformation/topics/<name>*    # Topic
ls vault/transformation/pipelines/<name>*  # Pipeline
ls vault/transformation/enums/<name>*      # Enum
ls vault/metrics/semantics/<name>*         # Semantic Model
ls vault/metrics/metric/<name>*            # Metric
ls vault/ingest/tables/<name>*             # Ingestion Table
ls vault/ingest/models/<name>*             # Ingestion Model
ls vault/ingest/modules/<name>*            # Ingestion Module
```

If a local file already exists, **read it directly** — no need to pull from remote.

### Step 2: Check Remote

| Entity               | Check Command                                         | Action if Exists                                 |
| -------------------- | ----------------------------------------------------- | ------------------------------------------------ |
| **Topic**            | `agent-cli topic list-remote --vault <vault>`         | Use same `name`; server upserts by topic name    |
| **Pipeline**         | `agent-cli pipeline list-remote --vault <vault>`      | Use same `name`; server upserts by pipeline name |
| **Enum**             | `agent-cli enum list-remote --vault <vault>`          | Set `enumId` to existing ID, update in place     |
| **Semantic Model**   | `agent-cli semantic list-remote --vault <vault>`      | Set `id` to existing ID, update in place         |
| **Metric**           | `agent-cli metric list-remote --vault <vault>`        | Set `id` to existing ID, update in place         |
| **Ingestion Table**  | `agent-cli ingest table list-remote --vault <vault>`  | Set `configId` to existing ID, update in place   |
| **Ingestion Model**  | `agent-cli ingest model list-remote --vault <vault>`  | Set `modelId` to existing ID, update in place    |
| **Ingestion Module** | `agent-cli ingest module list-remote --vault <vault>` | Set `moduleId` to existing ID, update in place   |
| **DataSource**       | `agent-cli datasource list-remote --vault <vault>`    | Use existing datasource, do not create duplicate |

### Standard Workflow for Any Entity

1. **Check local filesystem** — look for existing YAML files in the vault directory
2. If **found locally** → read the file, modify it, push it back
3. If **not found locally** → run `list-remote` to check remote
4. If **exists in remote** → pull the existing YAML, modify it, push it back
5. If **does not exist anywhere** → create new YAML and push

For Topic/Pipeline, do not manage IDs manually; server upserts by `name`. For legacy entities, continue using `null` for new IDs and real IDs for updates.

## Topic Validation

### Name and Field Uniqueness

- **No duplicate topic names** in the same vault
- **No duplicate factor names** within the same topic
- **No duplicate factor labels** within the same topic
- Factor names must be stable because pipeline references use `factorName`

### Factor Reference Validation

- Topic agent YAML must NOT include `factorId`; use `name` for factors.
- Never invent internal factor IDs. The server resolves factor IDs by name during agent-upsert.

### Data Source Validation

- **dataSourceCode must exist** and be valid in the system
- If unknown, run `agent-cli datasource list-remote --vault <vault>` to find available data sources

### Index Validation

- Unique indexes (u-\*) should be used for business keys used in `by` conditions
- Regular indexes (i-\*) should be used for foreign keys and frequently queried fields

---

## Pipeline Validation

### Name and Structure

- **No duplicate pipeline names** in the same vault
- Pipeline YAML must NOT include `pipelineId`, `stageId`, `unitId`, `actionId`, `topicId`, or `factorId`
- `sourceTopicName` must exist and must point to the source topic

### Factor Reference Validation

- Use `topicName` and `factorName` for action/parameter references.
- `mapping[].factorName` must exist in the target `topicName`.
- `source.topicName` / `source.factorName` and `by` conditions must reference existing topics/factors by name.
- For multiple fields read from the same other Topic, prefer one `read-row`; for a single `read-factor`, use `variableName: <topicName>_<factorName>`.
- Read variables used in `mapping[].source` must use `kind: constant`: `{<topicName>_row.<factorName>}` for rows and `{<topicName>_<factorName>}` for factors.

### BY Condition Validation

- `by` filters must reference valid `topicName` / `factorName` values on both sides
- jointType must be "and" or "or"

---

## Pre-Push Checklist

### Topic Creation

- [ ] Run `agent-cli topic list-remote --vault <vault>` to check for name conflicts
- [ ] Verify no duplicate factor names or labels in the topic
- [ ] Confirm dataSourceCode is valid
- [ ] Design appropriate indexes for query optimization

### Pipeline Creation/Update

- [ ] Run `agent-cli pipeline list-remote --vault <vault>` to check if pipeline exists
- [ ] If pipeline exists, keep the same `name`; do not set `pipelineId`
- [ ] Verify all `topicName` / `factorName` references in mapping are correct
- [ ] Verify all `topicName` / `factorName` references in `by` conditions are correct
- [ ] Check that root `sourceTopicName` matches the actual source topic

### Common Mistakes

1. **Creating duplicate entities**: Forgot to run `list-remote` and created a duplicate Topic/Pipeline/Enum/etc. instead of updating the existing one
2. **Invalid factorName references**: Factor doesn't exist in the referenced topic
3. **Wrong sourceTopicName in pipeline**: Mismatch between pipeline's source topic name and actual source
4. **Missing dataSourceCode**: Topic created without required dataSourceCode
5. **Including internal IDs**: Topic/Pipeline agent YAML should not contain `topicId`, `factorId`, `pipelineId`, etc.

---

## Local Validation Commands

```bash
# Check for duplicate topic names
agent-cli topic list-remote --vault <vault>

# Check for duplicate pipeline names
agent-cli pipeline list-remote --vault <vault>

# Check available data sources
agent-cli datasource list-remote --vault <vault>

# Pull existing topic to verify structure
agent-cli topic pull <topic_id> --vault <vault>

# Pull existing pipeline to verify structure
agent-cli pipeline pull <pipeline_id> --vault <vault>
```

---

## Collector Run and Repair Validation

Load `references/collector-operations.md` before operating Collector events.

### Before `collector run`

- [ ] Choose exactly one form: model time window, table time window (optionally one named Pipeline), or table records.
- [ ] Supply both start/end times for model and table time-window triggers.
- [ ] For records, validate a JSON object or non-empty array of objects; do not submit an empty array.
- [ ] Use `--wait` when the next step needs the final diagnosis, and treat timeout as “may still be running,” not as permission to retry.
- [ ] Keep `--auto-fix off` unless the user explicitly requested the narrowly scoped safe retry behavior.

### Before `apply-plan` or event `retry`

- [ ] Review `diagnose` output, especially `derivedStatus`, successful/failed Pipeline counts, `retryPipelineCandidates`, `eventRetryEligible`, and `manualActions`.
- [ ] For `apply-plan`, confirm the host, event ID, current `diagnosisHash`, exactly one eligible `retry_pipeline` action, and explicit `--yes`.
- [ ] For safe automation, require exactly one failed Pipeline with complete rerun evidence and only `TRANSIENT_INFRASTRUCTURE` issues. Configuration errors receive `manualActions`, not automatic changes.
- [ ] For event `retry`, require explicit `--yes`; never retry an unfinished event, one with any successful Pipeline execution, or one with untraceable task records.
- [ ] After retry, track `newEventTriggerId`; after Pipeline rerun, track the returned `traceId`. Neither is a CLI `correlationId`.
- [ ] If Metric/Ontology result validation is still required, hand off to `agent-runtime-cli` and its `eval run` / `eval log` workflow.

---

_Last Updated: 2026-10-26_
