CREATE TABLE materialization_job_locks
(
    lock_id            VARCHAR(50) NOT NULL,
    tenant_id          VARCHAR(50) NOT NULL,
    materialization_id VARCHAR(50) NOT NULL,
    frequency          VARCHAR(20) NOT NULL,
    process_date       DATE,
    status             VARCHAR(10) NOT NULL,
    user_id            VARCHAR(50) NOT NULL,
    created_at         DATETIME    NOT NULL,
    PRIMARY KEY (lock_id),
    UNIQUE INDEX uq_materialization_job_locks_on_scope (tenant_id, materialization_id, frequency, process_date),
    INDEX (tenant_id),
    INDEX (materialization_id),
    INDEX (status),
    INDEX (created_at)
);
