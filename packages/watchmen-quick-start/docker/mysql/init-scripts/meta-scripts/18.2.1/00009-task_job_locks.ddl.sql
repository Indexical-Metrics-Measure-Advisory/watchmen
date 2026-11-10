CREATE TABLE task_job_locks (
  lock_id VARCHAR(50) PRIMARY KEY, tenant_id VARCHAR(50) NOT NULL, task_id VARCHAR(50) NOT NULL,
  instance_key VARCHAR(512) NOT NULL, attempt INT NOT NULL, run_id VARCHAR(50) NOT NULL, owner_id VARCHAR(255),
  locked_at DATETIME, expires_at DATETIME,
  created_at DATETIME, created_by VARCHAR(50), last_modified_at DATETIME, last_modified_by VARCHAR(50),
  UNIQUE KEY uk_task_job_lock (tenant_id, task_id, instance_key, attempt), KEY idx_job_lock_run (tenant_id, run_id)
) ENGINE=InnoDB;
