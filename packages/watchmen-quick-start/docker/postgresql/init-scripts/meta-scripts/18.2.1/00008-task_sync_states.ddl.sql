CREATE TABLE task_sync_states (
  sync_id VARCHAR(50) PRIMARY KEY, tenant_id VARCHAR(50) NOT NULL, adapter_name VARCHAR(255) NOT NULL,
  cursor JSONB, status VARCHAR(32) NOT NULL, last_sync_at TIMESTAMP, last_success_at TIMESTAMP, error_message TEXT,
  created_at TIMESTAMP, created_by VARCHAR(50), last_modified_at TIMESTAMP, last_modified_by VARCHAR(50),
  CONSTRAINT uk_sync_adapter UNIQUE (tenant_id, adapter_name)
);
