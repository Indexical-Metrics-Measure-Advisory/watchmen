CREATE TABLE monitor_job_locks
(
    lock_id      VARCHAR(50) NOT NULL,
    tenant_id    VARCHAR(50) NOT NULL,
    topic_id     VARCHAR(50) NOT NULL,
    frequency    VARCHAR(20) NOT NULL,
    process_date DATE,
    status       VARCHAR(20) NOT NULL,
    user_id      VARCHAR(50) NOT NULL,
    created_at   DATETIME    NOT NULL,
    PRIMARY KEY (lock_id),
    UNIQUE INDEX (tenant_id, topic_id, frequency, process_date),
    INDEX (tenant_id),
    INDEX (topic_id),
    INDEX (frequency),
    INDEX (process_date),
    INDEX (status),
    INDEX (created_at)
);
