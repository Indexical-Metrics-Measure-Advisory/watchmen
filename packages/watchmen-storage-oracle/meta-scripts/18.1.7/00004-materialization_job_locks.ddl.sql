CREATE TABLE materialization_job_locks
(
    lock_id            VARCHAR2(50) NOT NULL,
    tenant_id          VARCHAR2(50) NOT NULL,
    materialization_id VARCHAR2(50) NOT NULL,
    frequency          VARCHAR2(20) NOT NULL,
    process_date       DATE,
    status             VARCHAR2(10) NOT NULL,
    user_id            VARCHAR2(50) NOT NULL,
    created_at         DATE         NOT NULL,
    CONSTRAINT pk_materialization_job_locks PRIMARY KEY (lock_id)
);
CREATE UNIQUE INDEX u_materialization_job_locks_1 ON materialization_job_locks (tenant_id, materialization_id, frequency, process_date);
CREATE INDEX i_materialization_job_locks_1 ON materialization_job_locks (tenant_id);
CREATE INDEX i_materialization_job_locks_2 ON materialization_job_locks (materialization_id);
CREATE INDEX i_materialization_job_locks_3 ON materialization_job_locks (status);
CREATE INDEX i_materialization_job_locks_4 ON materialization_job_locks (created_at);
