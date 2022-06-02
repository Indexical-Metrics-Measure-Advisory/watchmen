CREATE TABLE topic_snapshot_job_locks
(
    lock_id      NVARCHAR(50) NOT NULL,
    tenant_id    NVARCHAR(50) NOT NULL,
    scheduler_id NVARCHAR(50) NOT NULL,
    frequency    NVARCHAR(20) NOT NULL,
    process_date DATE,
    row_count    DECIMAL(10)  NOT NULL,
    status       NVARCHAR(20) NOT NULL,
    user_id      NVARCHAR(50) NOT NULL,
    created_at   DATETIME     NOT NULL,
    CONSTRAINT pk_topic_snapshot_job_locks PRIMARY KEY (lock_id)
);
CREATE UNIQUE INDEX u_topic_snapshot_job_locks_1 ON topic_snapshot_job_locks (tenant_id, scheduler_id, process_date);
CREATE INDEX i_topic_snapshot_job_locks_1 ON topic_snapshot_job_locks (tenant_id);
CREATE INDEX i_topic_snapshot_job_locks_2 ON topic_snapshot_job_locks (scheduler_id);
CREATE INDEX i_topic_snapshot_job_locks_3 ON topic_snapshot_job_locks (frequency);
CREATE INDEX i_topic_snapshot_job_locks_4 ON topic_snapshot_job_locks (process_date);
CREATE INDEX i_topic_snapshot_job_locks_5 ON topic_snapshot_job_locks (status);
CREATE INDEX i_topic_snapshot_job_locks_6 ON topic_snapshot_job_locks (created_at);
