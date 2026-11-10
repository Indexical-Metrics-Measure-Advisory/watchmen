CREATE TABLE task_refs (
  ref_id VARCHAR2(50) PRIMARY KEY, tenant_id VARCHAR2(50) NOT NULL, task_id VARCHAR2(50) NOT NULL,
  ref_type VARCHAR2(50) NOT NULL, target_id VARCHAR2(512) NOT NULL, target_name VARCHAR2(512), ref_role VARCHAR2(16) NOT NULL,
  inferred NUMBER(1) NOT NULL, unresolved NUMBER(1) NOT NULL,
  created_at TIMESTAMP, created_by VARCHAR2(50), last_modified_at TIMESTAMP, last_modified_by VARCHAR2(50)
);
CREATE INDEX idx_ref_asset ON task_refs (tenant_id, ref_type, target_id);
CREATE INDEX idx_ref_task ON task_refs (tenant_id, task_id);
