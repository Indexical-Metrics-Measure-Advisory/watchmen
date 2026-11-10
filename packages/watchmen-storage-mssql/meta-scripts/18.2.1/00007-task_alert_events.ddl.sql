CREATE TABLE task_alert_events (
  alert_event_id NVARCHAR(50) PRIMARY KEY, tenant_id NVARCHAR(50) NOT NULL, rule_id NVARCHAR(50) NOT NULL,
  task_id NVARCHAR(50), run_id NVARCHAR(50), event_key NVARCHAR(512) NOT NULL, status NVARCHAR(32) NOT NULL,
  payload NVARCHAR(MAX), error_message NVARCHAR(MAX), sent_at DATETIME2,
  created_at DATETIME2, created_by NVARCHAR(50), last_modified_at DATETIME2, last_modified_by NVARCHAR(50),
  CONSTRAINT uk_alert_event_key UNIQUE (tenant_id, event_key)
);
CREATE INDEX idx_alert_created ON task_alert_events (tenant_id, created_at);
