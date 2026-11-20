CREATE TABLE task_job_locks (
  lock_id VARCHAR(50) PRIMARY KEY, tenant_id VARCHAR(50) NOT NULL, task_id VARCHAR(50) NOT NULL,
  instance_key VARCHAR(512) NOT NULL, attempt INTEGER NOT NULL, run_id VARCHAR(50) NOT NULL, owner_id VARCHAR(255),
  locked_at TIMESTAMP, expires_at TIMESTAMP,
  created_at TIMESTAMP, created_by VARCHAR(50), last_modified_at TIMESTAMP, last_modified_by VARCHAR(50),
  CONSTRAINT uk_task_job_lock UNIQUE (tenant_id, task_id, instance_key, attempt)
);
CREATE INDEX idx_job_lock_run ON task_job_locks (tenant_id, run_id);
