CREATE TABLE task_run_dependencies (
  run_dependency_id VARCHAR(50) PRIMARY KEY, tenant_id VARCHAR(50) NOT NULL, run_id VARCHAR(50) NOT NULL,
  dependency_id VARCHAR(50) NOT NULL, upstream_run_id VARCHAR(50), state VARCHAR(32) NOT NULL,
  reason TEXT, evaluated_at DATETIME,
  created_at DATETIME, created_by VARCHAR(50), last_modified_at DATETIME, last_modified_by VARCHAR(50),
  UNIQUE KEY uk_run_dependency (tenant_id, run_id, dependency_id), KEY idx_run_upstream (tenant_id, upstream_run_id)
) ENGINE=InnoDB;
