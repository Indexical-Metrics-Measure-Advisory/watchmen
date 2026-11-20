CREATE TABLE task_alert_rules (
  rule_id NVARCHAR(50) PRIMARY KEY, tenant_id NVARCHAR(50) NOT NULL, name NVARCHAR(255) NOT NULL,
  scope_task_id NVARCHAR(50), scope_task_type NVARCHAR(50), event_type NVARCHAR(50) NOT NULL,
  threshold NVARCHAR(MAX), channel NVARCHAR(MAX), throttle_minutes INT NOT NULL, enabled BIT NOT NULL,
  created_at DATETIME2, created_by NVARCHAR(50), last_modified_at DATETIME2, last_modified_by NVARCHAR(50)
);
CREATE INDEX idx_alert_scope ON task_alert_rules (tenant_id, scope_task_id);
