CREATE TABLE task_sync_states (
  sync_id VARCHAR(50) PRIMARY KEY, tenant_id VARCHAR(50) NOT NULL, adapter_name VARCHAR(255) NOT NULL,
  cursor JSON, status VARCHAR(32) NOT NULL, last_sync_at DATETIME, last_success_at DATETIME, error_message TEXT,
  created_at DATETIME, created_by VARCHAR(50), last_modified_at DATETIME, last_modified_by VARCHAR(50),
  UNIQUE KEY uk_sync_adapter (tenant_id, adapter_name)
) ENGINE=InnoDB;
