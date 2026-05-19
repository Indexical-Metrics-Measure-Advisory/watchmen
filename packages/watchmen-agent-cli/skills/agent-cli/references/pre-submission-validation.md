# Pre-Submission Validation Guide

Before pushing any YAML to remote, always validate locally to avoid errors and unnecessary API calls.

---

## Topic Validation

### Name and Field Uniqueness
- **No duplicate topic names** in the same vault
- **No duplicate factor names** within the same topic
- **No duplicate factor labels** within the same topic
- **factorId must be unique** across the topic

### Data Source Validation
- **dataSourceId must exist** and be valid in the system
- If unknown, run `agent-cli datasource list-remote --vault <vault>` to find available data sources

### Index Validation
- Unique indexes (u-*) should be used for business keys used in `by` conditions
- Regular indexes (i-*) should be used for foreign keys and frequently queried fields

---

## Pipeline Validation

### Name and Structure
- **No duplicate pipeline names** in the same vault
- **pipelineId must match** the existing remote ID when updating (NOT null)
- All nested IDs (stageId, unitId, actionId) must be null for new entities

### Factor Reference Validation
- **All factor IDs must reference** existing factors in source/target topics
- mapping sources and targets must have valid factorId references
- Check that source topicId and factorId exist in the source topic
- Check that target topicId and factorId exist in the target topic

### BY Condition Validation
- `by` filters must reference valid factor IDs on both sides
- jointType must be "and" or "or"

---

## Pre-Push Checklist

### Topic Creation
- [ ] Run `agent-cli topic list-remote --vault <vault>` to check for name conflicts
- [ ] Verify no duplicate factor names or labels in the topic
- [ ] Confirm dataSourceId is valid
- [ ] Design appropriate indexes for query optimization

### Pipeline Creation/Update
- [ ] Run `agent-cli pipeline list-remote --vault <vault>` to check if pipeline exists
- [ ] If pipeline exists, set `pipelineId` to existing ID (NOT null)
- [ ] Verify all factorId references in mapping are correct
- [ ] Verify all factorId references in `by` conditions are correct
- [ ] Check that source `topicId` matches the actual source topic

### Common Mistakes
1. **Creating duplicate pipelines**: Forgot to check `list-remote` and used `pipelineId: null`
2. **Invalid factorId references**: Factor doesn't exist in the target topic
3. **Wrong topicId in pipeline**: Mismatch between pipeline's topicId and actual source
4. **Missing dataSourceId**: Topic created without required dataSourceId

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

*Last Updated: 2026-05-18*