CREATE TABLE snapshot_job_locks
(
    lock_id      VARCHAR(50) NOT NULL,
    tenant_id    VARCHAR(50) NOT NULL,
    scheduler_id VARCHAR(50) NOT NULL,
    frequency    VARCHAR(20) NOT NULL,
    process_date DATE,
    row_count    INT         NOT NULL,
    status       VARCHAR(20) NOT NULL,
    user_id      VARCHAR(50) NOT NULL,
    created_at   DATETIME    NOT NULL,
    PRIMARY KEY (lock_id),
    UNIQUE INDEX (tenant_id, scheduler_id, process_date),
    INDEX (tenant_id),
    INDEX (scheduler_id),
    INDEX (frequency),
    INDEX (process_date),
    INDEX (status),
    INDEX (created_at)
);
