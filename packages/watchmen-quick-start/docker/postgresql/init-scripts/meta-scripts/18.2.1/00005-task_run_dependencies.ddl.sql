CREATE TABLE task_run_dependencies (
  run_dependency_id VARCHAR(50) PRIMARY KEY, tenant_id VARCHAR(50) NOT NULL, run_id VARCHAR(50) NOT NULL,
  dependency_id VARCHAR(50) NOT NULL, upstream_run_id VARCHAR(50), state VARCHAR(32) NOT NULL,
  reason TEXT, evaluated_at TIMESTAMP,
  created_at TIMESTAMP, created_by VARCHAR(50), last_modified_at TIMESTAMP, last_modified_by VARCHAR(50),
  CONSTRAINT uk_run_dependency UNIQUE (tenant_id, run_id, dependency_id)
);
CREATE INDEX idx_run_upstream ON task_run_dependencies (tenant_id, upstream_run_id);
