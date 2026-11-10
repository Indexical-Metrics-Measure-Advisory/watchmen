CREATE TABLE task_run_dependencies (
  run_dependency_id NVARCHAR(50) PRIMARY KEY, tenant_id NVARCHAR(50) NOT NULL, run_id NVARCHAR(50) NOT NULL,
  dependency_id NVARCHAR(50) NOT NULL, upstream_run_id NVARCHAR(50), state NVARCHAR(32) NOT NULL,
  reason NVARCHAR(MAX), evaluated_at DATETIME2,
  created_at DATETIME2, created_by NVARCHAR(50), last_modified_at DATETIME2, last_modified_by NVARCHAR(50),
  CONSTRAINT uk_run_dependency UNIQUE (tenant_id, run_id, dependency_id)
);
CREATE INDEX idx_run_upstream ON task_run_dependencies (tenant_id, upstream_run_id);
