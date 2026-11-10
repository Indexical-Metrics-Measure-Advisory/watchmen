CREATE TABLE task_alert_events (
  alert_event_id VARCHAR2(50) PRIMARY KEY, tenant_id VARCHAR2(50) NOT NULL, rule_id VARCHAR2(50) NOT NULL,
  task_id VARCHAR2(50), run_id VARCHAR2(50), event_key VARCHAR2(512) NOT NULL, status VARCHAR2(32) NOT NULL,
  payload CLOB, error_message CLOB, sent_at TIMESTAMP,
  created_at TIMESTAMP, created_by VARCHAR2(50), last_modified_at TIMESTAMP, last_modified_by VARCHAR2(50),
  CONSTRAINT uk_alert_event_key UNIQUE (tenant_id, event_key)
);
CREATE INDEX idx_alert_created ON task_alert_events (tenant_id, created_at);
