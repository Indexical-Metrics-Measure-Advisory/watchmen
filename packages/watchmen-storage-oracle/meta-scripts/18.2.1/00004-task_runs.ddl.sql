CREATE TABLE task_runs (
  run_id VARCHAR2(50) PRIMARY KEY, tenant_id VARCHAR2(50) NOT NULL, task_id VARCHAR2(50) NOT NULL,
  task_type VARCHAR2(50) NOT NULL, instance_key VARCHAR2(512) NOT NULL, attempt NUMBER(10) NOT NULL, retry_of_run_id VARCHAR2(50),
  process_date DATE, window_start TIMESTAMP, window_end TIMESTAMP, status VARCHAR2(32) NOT NULL, trigger_type VARCHAR2(32) NOT NULL,
  bypass_dependencies NUMBER(1) NOT NULL, idempotency_key VARCHAR2(255) NOT NULL, request_hash VARCHAR2(50),
  engine_run_key VARCHAR2(512) NOT NULL, execution_target VARCHAR2(255), callback_token_hash VARCHAR2(50),
  started_at TIMESTAMP, finished_at TIMESTAMP, duration_ms NUMBER(10), row_count NUMBER(10),
  error_code VARCHAR2(128), error_message CLOB, result_refs CLOB, triggered_by VARCHAR2(50),
  created_at TIMESTAMP, created_by VARCHAR2(50), last_modified_at TIMESTAMP, last_modified_by VARCHAR2(50),
  CONSTRAINT uk_run_attempt UNIQUE (tenant_id, task_id, instance_key, attempt),
  CONSTRAINT uk_run_idempotency UNIQUE (tenant_id, task_id, idempotency_key),
  CONSTRAINT uk_run_engine UNIQUE (tenant_id, task_id, engine_run_key)
);
CREATE INDEX idx_run_status ON task_runs (tenant_id, status);
CREATE INDEX idx_run_process_date ON task_runs (tenant_id, process_date);
CREATE INDEX idx_run_started ON task_runs (tenant_id, task_id, started_at);
