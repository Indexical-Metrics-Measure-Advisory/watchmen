CREATE TABLE monitor_job_locks
(
    lock_id      VARCHAR(50) NOT NULL,
    tenant_id    VARCHAR(50) NOT NULL,
    topic_id     VARCHAR(50) NOT NULL,
    frequency    VARCHAR(20) NOT NULL,
    process_date TIMESTAMP,
    status       VARCHAR(20) NOT NULL,
    user_id      VARCHAR(50) NOT NULL,
    created_at   TIMESTAMP   NOT NULL,
    CONSTRAINT pk_monitor_job_locks PRIMARY KEY (lock_id)
);
CREATE UNIQUE INDEX u_monitor_job_locks_1 ON monitor_job_locks (tenant_id, topic_id, frequency, process_date);
CREATE INDEX i_monitor_job_locks_1 ON monitor_job_locks (tenant_id);
CREATE INDEX i_monitor_job_locks_2 ON monitor_job_locks (topic_id);
CREATE INDEX i_monitor_job_locks_3 ON monitor_job_locks (frequency);
CREATE INDEX i_monitor_job_locks_4 ON monitor_job_locks (process_date);
CREATE INDEX i_monitor_job_locks_5 ON monitor_job_locks (status);
CREATE INDEX i_monitor_job_locks_6 ON monitor_job_locks (created_at);
