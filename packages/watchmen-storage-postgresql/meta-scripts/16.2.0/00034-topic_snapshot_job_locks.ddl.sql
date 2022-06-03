CREATE TABLE snapshot_job_locks
(
    lock_id      VARCHAR(50) NOT NULL,
    tenant_id    VARCHAR(50) NOT NULL,
    scheduler_id VARCHAR(50) NOT NULL,
    frequency    VARCHAR(20) NOT NULL,
    process_date TIMESTAMP,
    row_count    DECIMAL(10) NOT NULL,
    status       VARCHAR(20) NOT NULL,
    user_id      VARCHAR(50) NOT NULL,
    created_at   TIMESTAMP   NOT NULL,
    CONSTRAINT pk_snapshot_job_locks PRIMARY KEY (lock_id)
);
CREATE UNIQUE INDEX u_snapshot_job_locks_1 ON snapshot_job_locks (tenant_id, scheduler_id, process_date);
CREATE INDEX i_snapshot_job_locks_1 ON snapshot_job_locks (tenant_id);
CREATE INDEX i_snapshot_job_locks_2 ON snapshot_job_locks (scheduler_id);
CREATE INDEX i_snapshot_job_locks_3 ON snapshot_job_locks (frequency);
CREATE INDEX i_snapshot_job_locks_4 ON snapshot_job_locks (process_date);
CREATE INDEX i_snapshot_job_locks_5 ON snapshot_job_locks (status);
CREATE INDEX i_snapshot_job_locks_6 ON snapshot_job_locks (created_at);
