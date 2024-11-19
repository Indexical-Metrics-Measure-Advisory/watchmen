CREATE TABLE documents
(
    tenant_id          VARCHAR(50) NOT NULL,
    document_id        VARCHAR(50) NOT NULL,
    document_name      VARCHAR(255) NOT NULL,
    document_type      VARCHAR(50) NOT NULL,
    document_status    VARCHAR(50) NOT NULL,
    document_content   BLOB NOT NULL,
    processed         BOOLEAN NOT NULL,
    verified          BOOLEAN NOT NULL,
    created_at         DATETIME    NOT NULL,
    created_by         VARCHAR(50) NOT NULL,
    last_modified_at   DATETIME    NOT NULL,
    last_modified_by   VARCHAR(50) NOT NULL,
    version            BIGINT,
    PRIMARY KEY (tenant_id, document_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
