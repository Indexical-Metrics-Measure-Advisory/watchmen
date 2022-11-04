CREATE TABLE operations
(
    record_id            VARCHAR(50) NOT NULL,
    operation_type       VARCHAR(20) NOT NULL,
    tuple_type           VARCHAR(20) NOT NULL,
    tuple_key            VARCHAR(20) NOT NULL,
    tuple_id             VARCHAR(100) NOT NULL,
    content              JSON,
    version_num          VARCHAR(50) NOT NULL,
    tenant_id            VARCHAR(50) NOT NULL,
    created_at           DATETIME    NOT NULL,
    created_by           VARCHAR(50) NOT NULL,
    last_modified_at     DATETIME    NOT NULL,
    last_modified_by     VARCHAR(50) NOT NULL,
    PRIMARY KEY (record_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
