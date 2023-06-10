CREATE TABLE collector_module_config
(
    module_id           VARCHAR(50)     NOT NULL,
    module_name         VARCHAR(50)     NOT NULL,
    priority            BIGINT          NOT NULL,
    version             BIGINT,
    tenant_id           VARCHAR(50)     NOT NULL,
    created_at          DATETIME        NOT NULL,
    created_by          VARCHAR(50)     NOT NULL,
    last_modified_at    DATETIME        NOT NULL,
    last_modified_by    VARCHAR(50)     NOT NULL,
    PRIMARY KEY (module_id),
    UNIQUE KEY unique_name(module_name),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);