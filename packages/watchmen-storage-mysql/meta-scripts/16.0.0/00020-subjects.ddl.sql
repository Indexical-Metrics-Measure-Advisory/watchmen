CREATE TABLE subjects
(
    subject_id            VARCHAR(50) NOT NULL,
    name                  VARCHAR(50) NOT NULL,
    connect_id            VARCHAR(50) NOT NULL,
    auto_refresh_interval BIGINT,
    dataset               JSON,
    user_id               VARCHAR(50) NOT NULL,
    tenant_id             VARCHAR(50) NOT NULL,
    last_visit_time       DATETIME    NOT NULL,
    created_at            DATETIME    NOT NULL,
    created_by            VARCHAR(50) NOT NULL,
    last_modified_at      DATETIME    NOT NULL,
    last_modified_by      VARCHAR(50) NOT NULL,
    PRIMARY KEY (subject_id),
    INDEX (name),
    INDEX (user_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
