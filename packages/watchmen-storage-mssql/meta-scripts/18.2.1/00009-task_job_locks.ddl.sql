CREATE TABLE task_job_locks (
  lock_id NVARCHAR(50) PRIMARY KEY, tenant_id NVARCHAR(50) NOT NULL, task_id NVARCHAR(50) NOT NULL,
  instance_key NVARCHAR(512) NOT NULL, attempt INT NOT NULL, run_id NVARCHAR(50) NOT NULL, owner_id NVARCHAR(255),
  locked_at DATETIME2, expires_at DATETIME2,
  created_at DATETIME2, created_by NVARCHAR(50), last_modified_at DATETIME2, last_modified_by NVARCHAR(50),
  CONSTRAINT uk_task_job_lock UNIQUE (tenant_id, task_id, instance_key, attempt)
);
CREATE INDEX idx_job_lock_run ON task_job_locks (tenant_id, run_id);
