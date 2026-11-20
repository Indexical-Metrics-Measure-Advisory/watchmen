CREATE TABLE task_runs (
  run_id NVARCHAR(50) PRIMARY KEY, tenant_id NVARCHAR(50) NOT NULL, task_id NVARCHAR(50) NOT NULL,
  task_type NVARCHAR(50) NOT NULL, instance_key NVARCHAR(512) NOT NULL, attempt INT NOT NULL, retry_of_run_id NVARCHAR(50),
  process_date DATE, window_start DATETIME2, window_end DATETIME2, status NVARCHAR(32) NOT NULL, trigger_type NVARCHAR(32) NOT NULL,
  bypass_dependencies BIT NOT NULL, idempotency_key NVARCHAR(255) NOT NULL, request_hash NVARCHAR(50),
  engine_run_key NVARCHAR(512) NOT NULL, execution_target NVARCHAR(255), callback_token_hash NVARCHAR(50),
  started_at DATETIME2, finished_at DATETIME2, duration_ms INT, row_count INT,
  error_code NVARCHAR(128), error_message NVARCHAR(MAX), result_refs NVARCHAR(MAX), triggered_by NVARCHAR(50),
  created_at DATETIME2, created_by NVARCHAR(50), last_modified_at DATETIME2, last_modified_by NVARCHAR(50),
  CONSTRAINT uk_run_attempt UNIQUE (tenant_id, task_id, instance_key, attempt),
  CONSTRAINT uk_run_idempotency UNIQUE (tenant_id, task_id, idempotency_key),
  CONSTRAINT uk_run_engine UNIQUE (tenant_id, task_id, engine_run_key)
);
CREATE INDEX idx_run_status ON task_runs (tenant_id, status);
CREATE INDEX idx_run_process_date ON task_runs (tenant_id, process_date);
CREATE INDEX idx_run_started ON task_runs (tenant_id, task_id, started_at);
