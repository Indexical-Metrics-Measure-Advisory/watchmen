CREATE TABLE task_definitions (
  task_id NVARCHAR(50) PRIMARY KEY, tenant_id NVARCHAR(50) NOT NULL, name NVARCHAR(255) NOT NULL,
  description NVARCHAR(MAX), task_type NVARCHAR(50) NOT NULL, execution_mode NVARCHAR(32) NOT NULL,
  engine_kind NVARCHAR(128) NOT NULL, engine_id NVARCHAR(255) NOT NULL, engine_ref NVARCHAR(MAX), schedule NVARCHAR(MAX),
  enabled BIT NOT NULL, owner_id NVARCHAR(50), tags NVARCHAR(MAX), params NVARCHAR(MAX),
  dependency_wait_timeout_minutes INT NOT NULL, freshness_sla_minutes INT, synced_at DATETIME2, last_run_summary NVARCHAR(MAX),
  created_at DATETIME2, created_by NVARCHAR(50), last_modified_at DATETIME2, last_modified_by NVARCHAR(50), version INT NOT NULL,
  CONSTRAINT uk_task_engine UNIQUE (tenant_id, engine_kind, engine_id)
);
CREATE INDEX idx_task_type ON task_definitions (tenant_id, task_type);
