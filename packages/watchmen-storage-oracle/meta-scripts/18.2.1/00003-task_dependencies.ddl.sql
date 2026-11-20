CREATE TABLE task_dependencies (
  dependency_id VARCHAR2(50) PRIMARY KEY, tenant_id VARCHAR2(50) NOT NULL,
  upstream_task_id VARCHAR2(50) NOT NULL, downstream_task_id VARCHAR2(50) NOT NULL, kind VARCHAR2(32) NOT NULL,
  adoption_status VARCHAR2(32) NOT NULL, condition_type VARCHAR2(32) NOT NULL, instance_policy VARCHAR2(32) NOT NULL,
  enabled NUMBER(1) NOT NULL, offset_days NUMBER(10) NOT NULL, declared_by VARCHAR2(50),
  created_at TIMESTAMP, created_by VARCHAR2(50), last_modified_at TIMESTAMP, last_modified_by VARCHAR2(50),
  CONSTRAINT uk_dependency_pair UNIQUE (tenant_id, downstream_task_id, upstream_task_id)
);
CREATE INDEX idx_dependency_upstream ON task_dependencies (tenant_id, upstream_task_id);
