CREATE TABLE task_runs (
  run_id VARCHAR(50) PRIMARY KEY, tenant_id VARCHAR(50) NOT NULL, task_id VARCHAR(50) NOT NULL,
  task_type VARCHAR(50) NOT NULL, instance_key VARCHAR(512) NOT NULL, attempt INT NOT NULL, retry_of_run_id VARCHAR(50),
  process_date DATE, window_start DATETIME, window_end DATETIME, status VARCHAR(32) NOT NULL, trigger_type VARCHAR(32) NOT NULL,
  bypass_dependencies BOOLEAN NOT NULL, idempotency_key VARCHAR(255) NOT NULL, request_hash VARCHAR(50),
  engine_run_key VARCHAR(512) NOT NULL, execution_target VARCHAR(255), callback_token_hash VARCHAR(50),
  started_at DATETIME, finished_at DATETIME, duration_ms INT, row_count INT,
  error_code VARCHAR(128), error_message TEXT, result_refs JSON, triggered_by VARCHAR(50),
  created_at DATETIME, created_by VARCHAR(50), last_modified_at DATETIME, last_modified_by VARCHAR(50),
  UNIQUE KEY uk_run_attempt (tenant_id, task_id, instance_key, attempt),
  UNIQUE KEY uk_run_idempotency (tenant_id, task_id, idempotency_key),
  UNIQUE KEY uk_run_engine (tenant_id, task_id, engine_run_key),
  KEY idx_run_status (tenant_id, status), KEY idx_run_process_date (tenant_id, process_date),
  KEY idx_run_started (tenant_id, task_id, started_at)
) ENGINE=InnoDB;
