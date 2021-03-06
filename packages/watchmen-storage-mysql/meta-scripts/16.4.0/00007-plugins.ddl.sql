CREATE TABLE plugins
(
    plugin_id        VARCHAR(50) NOT NULL,
    plugin_code      VARCHAR(50) NOT NULL,
    name             VARCHAR(255),
    type             VARCHAR(50) NOT NULL,
    apply_to         VARCHAR(50) NOT NULL,
    params           JSON,
    results          JSON,
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       DATETIME    NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at DATETIME    NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          BIGINT,
    PRIMARY KEY (plugin_id),
    INDEX (plugin_code),
    INDEX (type),
    INDEX (apply_to),
    INDEX (tenant_id),
    UNIQUE INDEX (plugin_code, tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
