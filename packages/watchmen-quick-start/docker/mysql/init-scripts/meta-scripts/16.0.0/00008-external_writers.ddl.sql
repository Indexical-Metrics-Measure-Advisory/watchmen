CREATE TABLE external_writers
(
    writer_id        VARCHAR(50) NOT NULL,
    writer_code      VARCHAR(50) NOT NULL,
    type             VARCHAR(50) NOT NULL,
    pat              VARCHAR(255),
    url              VARCHAR(255),
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       DATETIME    NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at DATETIME    NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          BIGINT,
    PRIMARY KEY (writer_id),
    INDEX (writer_code),
    INDEX (type),
    INDEX (tenant_id),
    UNIQUE INDEX (writer_code, tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
