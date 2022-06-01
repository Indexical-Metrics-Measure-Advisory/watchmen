CREATE TABLE notebooks
(
    notebook_id      VARCHAR(50)  NOT NULL,
    name       VARCHAR(50) NOT NULL,
    storage_type     VARCHAR(50)  NOT NULL,
    storage_location    VARCHAR(200),
    tenant_id   VARCHAR(50)  NOT NULL,
    environment        JSON,
    dependencies     JSON,
    created_at         DATETIME    NOT NULL,
    created_by         VARCHAR(50) NOT NULL,
    last_modified_at   DATETIME    NOT NULL,
    last_modified_by   VARCHAR(50) NOT NULL,
    PRIMARY KEY (notebook_id),
    INDEX (tenant_id)
);
