# Alert Action Execution Service Design

## Background
- Current implementation mixes two concerns into one endpoint:
  - `ack` (user acknowledges alert instance)
  - action execution for manual/approval actions
- This causes semantic confusion on frontend and backend.
- Repeated alert runs may create too many `alert_instances`, making instance count inaccurate.

## Goals
- Separate responsibilities:
  - `ack` only updates acknowledge fields and mute window.
  - `action execute` only executes pending manual actions and updates `action_executed`.
- Keep action execution idempotent.
- Avoid duplicate active (unacknowledged) instances for the same rule/tenant.

## Non-Goals
- No change to existing action plugin protocol.
- No change to alert rule definition schema.

## API Design

### 1) Acknowledge Alert Instance
- Endpoint: `POST /metricflow/alert-rule/ack`
- Request:
```json
{
  "instanceId": "string",
  "reason": "processed|ignored|escalated|false_alarm|maintenance|other",
  "intervalMinutes": 60
}
```
- Behavior:
  - Set `acknowledged=true`
  - Set `acknowledged_by`, `acknowledged_at`
  - Set `acknowledge_reason`
  - If `intervalMinutes > 0`, set `next_trigger_time`
  - Does **not** execute actions

### 2) Execute Pending Actions
- Endpoint: `POST /metricflow/alert-rule/action/execute`
- Request:
```json
{
  "instanceId": "string"
}
```
- Behavior:
  - Load instance by `instanceId + tenantId`
  - If `actionExecuted=true`, return directly (idempotent)
  - Execute pending manual/approval actions
  - Set `actionExecuted=true`
  - Return latest instance

## Domain State
- `acknowledged`: user confirmed instance handling status.
- `actionExecuted`: pending manual actions have been executed.
- They are independent fields and can be updated independently.

## Instance Count Consistency

### Problem
- `run_alert_rule` previously could create a new unacknowledged instance on repeated runs while a previous unacknowledged one still exists.

### Strategy
- Before creating a new instance:
  - Query by `rule_id + tenant_id`
  - Reuse the latest unacknowledged instance if exists
  - Only create new instance when no active unacknowledged instance exists

### Result
- One active unacknowledged instance per rule/tenant at a time.
- History remains in acknowledged records.
- Dashboard statistics are more stable and meaningful.

## Idempotency & Concurrency
- `action/execute` is idempotent through `actionExecuted` guard.
- Duplicate execution requests for same instance are safe.
- Instance reuse in `run_alert_rule` reduces duplicate rows during frequent polling.

## Frontend Contract
- Execute button calls `POST /metricflow/alert-rule/action/execute`.
- Acknowledge dialog confirms through `POST /metricflow/alert-rule/ack`.
- UI status:
  - action execution toast depends on `actionExecuted`.
  - acknowledge status depends on `acknowledged`.

## Rollout Plan
1. Deploy backend with new endpoint and run-path dedup logic.
2. Switch frontend execute button to `action/execute`.
3. Keep `ack` backward-compatible.
4. Validate with integration test:
  - execute action without ack
  - ack without execute
  - repeated run does not inflate active instances.

## Risks
- Existing downstream code assuming ack triggers execution may need migration.
- If multiple old active instances already exist, dedup logic only prevents new growth; historical cleanup may still be required.
