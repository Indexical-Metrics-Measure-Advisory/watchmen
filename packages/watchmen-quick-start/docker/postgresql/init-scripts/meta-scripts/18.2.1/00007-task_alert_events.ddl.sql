CREATE TABLE task_alert_events (
  alert_event_id VARCHAR(50) PRIMARY KEY, tenant_id VARCHAR(50) NOT NULL, rule_id VARCHAR(50) NOT NULL,
  task_id VARCHAR(50), run_id VARCHAR(50), event_key VARCHAR(512) NOT NULL, status VARCHAR(32) NOT NULL,
  payload JSONB, error_message TEXT, sent_at TIMESTAMP,
  created_at TIMESTAMP, created_by VARCHAR(50), last_modified_at TIMESTAMP, last_modified_by VARCHAR(50),
  CONSTRAINT uk_alert_event_key UNIQUE (tenant_id, event_key)
);
CREATE INDEX idx_alert_created ON task_alert_events (tenant_id, created_at);
