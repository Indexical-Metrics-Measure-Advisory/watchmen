CREATE TABLE documents
(
    document_id        VARCHAR(50) NOT NULL,
    document_name      VARCHAR(255) NOT NULL,
    document_type      VARCHAR(50) NOT NULL,
    document_status    VARCHAR(50) NOT NULL,
    document_content   BLOB NOT NULL,
    processed          TINYINT(1) NOT NULL,
    verified           TINYINT(1) NOT NULL,
    tenant_id          VARCHAR(50) NOT NULL,
    created_at         DATETIME    NOT NULL,
    created_by         VARCHAR(50) NOT NULL,
    last_modified_at   DATETIME    NOT NULL,
    last_modified_by   VARCHAR(50) NOT NULL,
    version            INTEGER,
    PRIMARY KEY (document_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
