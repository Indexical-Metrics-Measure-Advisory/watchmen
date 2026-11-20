CREATE TABLE task_refs (
  ref_id NVARCHAR(50) PRIMARY KEY, tenant_id NVARCHAR(50) NOT NULL, task_id NVARCHAR(50) NOT NULL,
  ref_type NVARCHAR(50) NOT NULL, target_id NVARCHAR(512) NOT NULL, target_name NVARCHAR(512), ref_role NVARCHAR(16) NOT NULL,
  inferred BIT NOT NULL, unresolved BIT NOT NULL,
  created_at DATETIME2, created_by NVARCHAR(50), last_modified_at DATETIME2, last_modified_by NVARCHAR(50)
);
CREATE INDEX idx_ref_asset ON task_refs (tenant_id, ref_type, target_id);
CREATE INDEX idx_ref_task ON task_refs (tenant_id, task_id);
