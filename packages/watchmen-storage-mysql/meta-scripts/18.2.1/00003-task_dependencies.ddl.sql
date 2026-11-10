CREATE TABLE task_dependencies (
  dependency_id VARCHAR(50) PRIMARY KEY, tenant_id VARCHAR(50) NOT NULL,
  upstream_task_id VARCHAR(50) NOT NULL, downstream_task_id VARCHAR(50) NOT NULL, kind VARCHAR(32) NOT NULL,
  adoption_status VARCHAR(32) NOT NULL, condition_type VARCHAR(32) NOT NULL, instance_policy VARCHAR(32) NOT NULL,
  enabled BOOLEAN NOT NULL, offset_days INT NOT NULL, declared_by VARCHAR(50),
  created_at DATETIME, created_by VARCHAR(50), last_modified_at DATETIME, last_modified_by VARCHAR(50),
  UNIQUE KEY uk_dependency_pair (tenant_id, downstream_task_id, upstream_task_id),
  KEY idx_dependency_upstream (tenant_id, upstream_task_id)
) ENGINE=InnoDB;
