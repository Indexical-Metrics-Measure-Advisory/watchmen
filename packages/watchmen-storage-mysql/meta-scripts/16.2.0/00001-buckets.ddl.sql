CREATE TABLE buckets
(
    bucket_id        VARCHAR(50) NOT NULL,
    name             VARCHAR(50),
    type             VARCHAR(20) NOT NULL,
    include          VARCHAR(20),
    measure          VARCHAR(20),
    enum_id          VARCHAR(50),
    segments         JSON,
    description      VARCHAR(1024),
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       DATETIME    NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at DATETIME    NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          BIGINT,
    PRIMARY KEY (bucket_id),
    INDEX (name),
    INDEX (type),
    INDEX (measure),
    INDEX (enum_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
