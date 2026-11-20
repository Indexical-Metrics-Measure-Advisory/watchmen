CREATE TABLE task_alert_events (
  alert_event_id VARCHAR(50) PRIMARY KEY, tenant_id VARCHAR(50) NOT NULL, rule_id VARCHAR(50) NOT NULL,
  task_id VARCHAR(50), run_id VARCHAR(50), event_key VARCHAR(512) NOT NULL, status VARCHAR(32) NOT NULL,
  payload JSON, error_message TEXT, sent_at DATETIME,
  created_at DATETIME, created_by VARCHAR(50), last_modified_at DATETIME, last_modified_by VARCHAR(50),
  UNIQUE KEY uk_alert_event_key (tenant_id, event_key), KEY idx_alert_created (tenant_id, created_at)
) ENGINE=InnoDB;
