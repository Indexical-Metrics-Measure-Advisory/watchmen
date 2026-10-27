# Collector Operations

Use this reference for Collector execution, diagnosis, controlled repair, and handoff. The commands operate the existing Watchmen REST APIs; they do not provide a general LLM repair agent, unified Durable Runtime, Lambda execution, or cross-resource atomic build.

All examples use `agent-cli`; `poetry run python -m agent_cli.main ...` is equivalent. Pass `--vault <vault>` explicitly. Commands other than `collector calls` also accept `--correlation-id`.

## Trigger and Wait

Choose exactly one input form:

```bash
# Model time window
agent-cli collector run --model "<model_name>" \
  --start-time <time> --end-time <time> --wait --vault <vault>

# Table time window; --pipeline optionally narrows the trigger
agent-cli collector run --table "<table_name>" \
  --start-time <time> --end-time <time> --wait --vault <vault>
agent-cli collector run --table "<table_name>" --pipeline "<pipeline_name>" \
  --start-time <time> --end-time <time> --wait --vault <vault>

# One JSON object or a non-empty JSON array of objects
agent-cli collector run --table "<table_name>" \
  --records-file <json_path> --wait --vault <vault>
```

Model and table time-window triggers require both times. Record triggers require a table and at least one record. Model and Pipeline names must resolve uniquely. Without `--wait`, a successful trigger returns `eventTriggerId` and `status: TRIGGERED`; with `--wait`, the CLI polls until the event is finished and adds its diagnosis. Defaults are `--timeout 300` seconds and `--poll-interval 2` seconds. Timeout means the work may still be running, not that retry is safe.

`--auto-fix` defaults to `off`. The safe mode and `--max-fix-attempts` are described below.

## Status, Logs, and Diagnosis

```bash
agent-cli collector status <event_trigger_id> --vault <vault>
agent-cli collector diagnose <event_trigger_id> --vault <vault>
agent-cli collector logs <event_trigger_id> --vault <vault>
agent-cli collector logs <event_trigger_id> --no-pipeline-logs --vault <vault>
agent-cli collector logs <event_trigger_id> --errors-only --vault <vault>
```

`status` and `diagnose` return the derived diagnosis. `logs` includes Collector execution detail and, by default, pages for every linked Pipeline `traceId`; `--errors-only` reduces Collector detail to errors and keeps only Pipeline pages containing errors.

Important diagnosis fields:

- `derivedStatus`: `RUNNING`, `SUCCEEDED`, `COMPLETED`, `FAILED`, or `PARTIAL`. This is derived from event and log evidence, not a replacement for raw `eventStatus`.
- `evidenceComplete`: whether the server execution detail is untruncated. If false, fix plans become `manual_review` and event retry is blocked.
- `issues`: categorized Collector and nested Pipeline errors, with evidence and stable signatures.
- `traceIds`, `pipelineLogCount`, `failedPipelineCount`, `successfulPipelineCount`: observed execution evidence.
- `retryPipelineCandidates`: failed Pipeline logs carrying complete `topicId`, `dataId`, and `pipelineId` rerun inputs.
- `eventRetryEligible`: whether the event-level retry guards pass.
- `manualActions`: required human investigation, including unavailable failure details and non-transient categories.
- `diagnosisHash`: binds a fix plan to the current evidence.

`PARTIAL` can include both successful and failed Pipeline executions. Do not treat it as a wholly failed event.

## Fix Plan and Confirmed Pipeline Rerun

```bash
agent-cli collector fix-plan <event_trigger_id> \
  --output <plan_path> --vault <vault>
# Review the plan and current diagnosis before applying it.
agent-cli collector apply-plan <plan_path> --yes --vault <vault>
```

A Pipeline retry action is produced only when there is exactly one failed Pipeline and one candidate with complete rerun evidence. Otherwise the plan contains `manual_review`. `apply-plan` requires `--yes`, exactly one eligible `retry_pipeline` action, and a plan whose host, event ID, and `diagnosisHash` still match the current diagnosis. It reruns the Pipeline and waits on the returned `traceId`; a missing `traceId` is an error. The result is `RECOVERED` only when the returned Pipeline logs contain no `ERROR`.

A manually confirmed plan and safe automation use different eligibility fields: `autoApplyEligible` versus `safeAutoEligible`. Never infer that an action is safe for automation merely because a person may explicitly apply it.

## Safe Auto-Fix Boundary

```bash
agent-cli collector run --table "<table_name>" \
  --records-file <json_path> --wait --auto-fix safe --vault <vault>
```

Safe mode is available only after waiting and only for a `FAILED` or `PARTIAL` diagnosis. It automatically reruns a Pipeline only when all of these conditions hold:

1. `evidenceComplete` is true; truncated execution detail always blocks automatic repair.
2. Exactly one Pipeline failed.
3. That failure yields exactly one retry candidate with complete `topicId`, `dataId`, and `pipelineId` evidence.
4. The complete set of issue categories is exactly `{TRANSIENT_INFRASTRUCTURE}`.

It does not modify Topic, Pipeline, Collector, or other configuration. Authentication/permission failures, missing Factor/Topic/Pipeline/table/column metadata, type conversion, and `UNKNOWN` errors remain `manualActions`; safe mode performs no automatic change for them. If no action is eligible, the result contains `autoFixStopped`. If the automatic rerun still fails, the loop stops even when `--max-fix-attempts` is greater than one. This is a rule-based retry, not general LLM automatic repair.

## Guarded Event Retry

```bash
agent-cli collector retry <event_trigger_id> --yes --wait --vault <vault>
```

Event retry is different from a single Pipeline rerun. It creates a new Collector event from the supported original event payload and returns `sourceEventTriggerId` plus `newEventTriggerId`. `--yes` is mandatory; `--wait` follows and diagnoses the new event.

Retry is blocked unless the original event is finished and derived as `FAILED` or `PARTIAL`, and all guards pass:

- **Complete-evidence guard:** any `truncated` execution detail sets `evidenceComplete=false` and blocks retry.
- **Partial-success guard:** any successful Pipeline execution blocks event retry, avoiding duplicate processing of completed work.
- **Untraceable-task guard:** if any active/history task lacks `task.result.traceLinks`, retry is blocked because the CLI cannot safely trace all work.

Do not bypass these guards. Inspect the successful executions, Collector task history, and server logs instead.

## Identifiers and Local Call Ledger

| Identifier | Meaning | How to use it |
| --- | --- | --- |
| `correlationId` | Groups one or more CLI invocations and is sent as `X-Correlation-Id`. Precedence: `--correlation-id`, `AGENT_CLI_CORRELATION_ID`, generated `cli-<uuid>`. | Reuse it for a workflow; inspect `<vault>/.agent-cli/query-log.jsonl` through `collector calls`. |
| `eventTriggerId` | Identifies one Collector event. | Use with `status`, `logs`, `diagnose`, `fix-plan`, and source-event `retry`. Event retry returns a new ID. |
| `traceId` | Identifies one Pipeline execution/log stream. | Use it to interpret Pipeline logs and repair results; it is not a Collector event ID. |

```bash
agent-cli collector calls --correlation-id <id> --limit 100 --vault <vault>
```

The local call ledger records command parameters, status, duration, and result summaries; it is not the Collector task history or Pipeline log store.

## Handoff to Metric/Ontology Eval

Collector recovery proves operational execution, not Metric or Ontology answer correctness. When follow-up validation is requested, preserve the event ID, trace IDs, correlation ID, diagnosis, and repair result as context, then invoke `agent-runtime-cli` for `metrics`/`ontology` queries and `eval run` / `eval log`. The two CLIs have separate vault metadata and call ledgers; there is no automatic durable handoff between them.
