CREATE TABLE task_alert_rules (
  rule_id VARCHAR(50) PRIMARY KEY, tenant_id VARCHAR(50) NOT NULL, name VARCHAR(255) NOT NULL,
  scope_task_id VARCHAR(50), scope_task_type VARCHAR(50), event_type VARCHAR(50) NOT NULL,
  threshold JSON, channel JSON, throttle_minutes INT NOT NULL, enabled BOOLEAN NOT NULL,
  created_at DATETIME, created_by VARCHAR(50), last_modified_at DATETIME, last_modified_by VARCHAR(50),
  KEY idx_alert_scope (tenant_id, scope_task_id)
) ENGINE=InnoDB;
