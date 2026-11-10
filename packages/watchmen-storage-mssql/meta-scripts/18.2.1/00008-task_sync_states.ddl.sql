CREATE TABLE task_sync_states (
  sync_id NVARCHAR(50) PRIMARY KEY, tenant_id NVARCHAR(50) NOT NULL, adapter_name NVARCHAR(255) NOT NULL,
  cursor NVARCHAR(MAX), status NVARCHAR(32) NOT NULL, last_sync_at DATETIME2, last_success_at DATETIME2, error_message NVARCHAR(MAX),
  created_at DATETIME2, created_by NVARCHAR(50), last_modified_at DATETIME2, last_modified_by NVARCHAR(50),
  CONSTRAINT uk_sync_adapter UNIQUE (tenant_id, adapter_name)
);
