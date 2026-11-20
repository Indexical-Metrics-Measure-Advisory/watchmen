CREATE TABLE task_definitions (
  task_id VARCHAR(50) PRIMARY KEY, tenant_id VARCHAR(50) NOT NULL, name VARCHAR(255) NOT NULL,
  description TEXT, task_type VARCHAR(50) NOT NULL, execution_mode VARCHAR(32) NOT NULL,
  engine_kind VARCHAR(128) NOT NULL, engine_id VARCHAR(255) NOT NULL, engine_ref JSON, schedule JSON,
  enabled BOOLEAN NOT NULL, owner_id VARCHAR(50), tags JSON, params JSON,
  dependency_wait_timeout_minutes INT NOT NULL, freshness_sla_minutes INT, synced_at DATETIME, last_run_summary JSON,
  created_at DATETIME, created_by VARCHAR(50), last_modified_at DATETIME, last_modified_by VARCHAR(50), version INT NOT NULL,
  UNIQUE KEY uk_task_engine (tenant_id, engine_kind, engine_id), KEY idx_task_type (tenant_id, task_type)
) ENGINE=InnoDB;
