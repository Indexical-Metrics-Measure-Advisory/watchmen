CREATE TABLE task_dependencies (
  dependency_id NVARCHAR(50) PRIMARY KEY, tenant_id NVARCHAR(50) NOT NULL,
  upstream_task_id NVARCHAR(50) NOT NULL, downstream_task_id NVARCHAR(50) NOT NULL, kind NVARCHAR(32) NOT NULL,
  adoption_status NVARCHAR(32) NOT NULL, condition_type NVARCHAR(32) NOT NULL, instance_policy NVARCHAR(32) NOT NULL,
  enabled BIT NOT NULL, offset_days INT NOT NULL, declared_by NVARCHAR(50),
  created_at DATETIME2, created_by NVARCHAR(50), last_modified_at DATETIME2, last_modified_by NVARCHAR(50),
  CONSTRAINT uk_dependency_pair UNIQUE (tenant_id, downstream_task_id, upstream_task_id)
);
CREATE INDEX idx_dependency_upstream ON task_dependencies (tenant_id, upstream_task_id);
