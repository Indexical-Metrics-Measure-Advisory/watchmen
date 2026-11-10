CREATE TABLE task_refs (
  ref_id VARCHAR(50) PRIMARY KEY, tenant_id VARCHAR(50) NOT NULL, task_id VARCHAR(50) NOT NULL,
  ref_type VARCHAR(50) NOT NULL, target_id VARCHAR(512) NOT NULL, target_name VARCHAR(512), ref_role VARCHAR(16) NOT NULL,
  inferred BOOLEAN NOT NULL, unresolved BOOLEAN NOT NULL,
  created_at DATETIME, created_by VARCHAR(50), last_modified_at DATETIME, last_modified_by VARCHAR(50),
  KEY idx_ref_asset (tenant_id, ref_type, target_id), KEY idx_ref_task (tenant_id, task_id)
) ENGINE=InnoDB;
