CREATE TABLE task_alert_rules (
  rule_id VARCHAR2(50) PRIMARY KEY, tenant_id VARCHAR2(50) NOT NULL, name VARCHAR2(255) NOT NULL,
  scope_task_id VARCHAR2(50), scope_task_type VARCHAR2(50), event_type VARCHAR2(50) NOT NULL,
  threshold CLOB, channel CLOB, throttle_minutes NUMBER(10) NOT NULL, enabled NUMBER(1) NOT NULL,
  created_at TIMESTAMP, created_by VARCHAR2(50), last_modified_at TIMESTAMP, last_modified_by VARCHAR2(50)
);
CREATE INDEX idx_alert_scope ON task_alert_rules (tenant_id, scope_task_id);
