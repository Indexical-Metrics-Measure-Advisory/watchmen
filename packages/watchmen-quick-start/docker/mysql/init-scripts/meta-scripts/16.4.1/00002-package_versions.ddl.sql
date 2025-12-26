CREATE TABLE package_versions
(
    version_id           VARCHAR(50) NOT NULL,
    previous_version     VARCHAR(20) NOT NULL,
    current_version      VARCHAR(20) NOT NULL,
    tenant_id            VARCHAR(50) NOT NULL,
    created_at           DATETIME    NOT NULL,
    created_by           VARCHAR(50) NOT NULL,
    last_modified_at     DATETIME    NOT NULL,
    last_modified_by     VARCHAR(50) NOT NULL,
    PRIMARY KEY (version_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
