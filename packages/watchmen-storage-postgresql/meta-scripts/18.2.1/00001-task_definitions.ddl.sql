CREATE TABLE task_definitions (
  task_id VARCHAR(50) PRIMARY KEY, tenant_id VARCHAR(50) NOT NULL, name VARCHAR(255) NOT NULL,
  description TEXT, task_type VARCHAR(50) NOT NULL, execution_mode VARCHAR(32) NOT NULL,
  engine_kind VARCHAR(128) NOT NULL, engine_id VARCHAR(255) NOT NULL, engine_ref JSONB, schedule JSONB,
  enabled BOOLEAN NOT NULL, owner_id VARCHAR(50), tags JSONB, params JSONB,
  dependency_wait_timeout_minutes INTEGER NOT NULL, freshness_sla_minutes INTEGER, synced_at TIMESTAMP, last_run_summary JSONB,
  created_at TIMESTAMP, created_by VARCHAR(50), last_modified_at TIMESTAMP, last_modified_by VARCHAR(50), version INTEGER NOT NULL,
  CONSTRAINT uk_task_engine UNIQUE (tenant_id, engine_kind, engine_id)
);
CREATE INDEX idx_task_type ON task_definitions (tenant_id, task_type);
