CREATE TABLE task_runs (
  run_id VARCHAR(50) PRIMARY KEY, tenant_id VARCHAR(50) NOT NULL, task_id VARCHAR(50) NOT NULL,
  task_type VARCHAR(50) NOT NULL, instance_key VARCHAR(512) NOT NULL, attempt INTEGER NOT NULL, retry_of_run_id VARCHAR(50),
  process_date DATE, window_start TIMESTAMP, window_end TIMESTAMP, status VARCHAR(32) NOT NULL, trigger_type VARCHAR(32) NOT NULL,
  bypass_dependencies BOOLEAN NOT NULL, idempotency_key VARCHAR(255) NOT NULL, request_hash VARCHAR(50),
  engine_run_key VARCHAR(512) NOT NULL, execution_target VARCHAR(255), callback_token_hash VARCHAR(50),
  started_at TIMESTAMP, finished_at TIMESTAMP, duration_ms INTEGER, row_count INTEGER,
  error_code VARCHAR(128), error_message TEXT, result_refs JSONB, triggered_by VARCHAR(50),
  created_at TIMESTAMP, created_by VARCHAR(50), last_modified_at TIMESTAMP, last_modified_by VARCHAR(50),
  CONSTRAINT uk_run_attempt UNIQUE (tenant_id, task_id, instance_key, attempt),
  CONSTRAINT uk_run_idempotency UNIQUE (tenant_id, task_id, idempotency_key),
  CONSTRAINT uk_run_engine UNIQUE (tenant_id, task_id, engine_run_key)
);
CREATE INDEX idx_run_status ON task_runs (tenant_id, status);
CREATE INDEX idx_run_process_date ON task_runs (tenant_id, process_date);
CREATE INDEX idx_run_started ON task_runs (tenant_id, task_id, started_at);
