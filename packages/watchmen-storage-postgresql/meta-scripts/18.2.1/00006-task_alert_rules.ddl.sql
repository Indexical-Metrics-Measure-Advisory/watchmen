CREATE TABLE task_alert_rules (
  rule_id VARCHAR(50) PRIMARY KEY, tenant_id VARCHAR(50) NOT NULL, name VARCHAR(255) NOT NULL,
  scope_task_id VARCHAR(50), scope_task_type VARCHAR(50), event_type VARCHAR(50) NOT NULL,
  threshold JSONB, channel JSONB, throttle_minutes INTEGER NOT NULL, enabled BOOLEAN NOT NULL,
  created_at TIMESTAMP, created_by VARCHAR(50), last_modified_at TIMESTAMP, last_modified_by VARCHAR(50)
);
CREATE INDEX idx_alert_scope ON task_alert_rules (tenant_id, scope_task_id);
