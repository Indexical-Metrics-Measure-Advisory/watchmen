CREATE TABLE collector_plugin_config
(
    plugin_id           VARCHAR(50) NOT NULL,
    name                VARCHAR(50) NOT NULL,
    table_name          VARCHAR(50) NOT NULL,
    primary_key         JSON NOT NULL,
	conditions          JSON NOT NULL,
    data_source_id      VARCHAR(50) NOT NULL,
    version             BIGINT      NOT NULL,
    tenant_id           VARCHAR(50) NOT NULL,
    created_at          DATETIME    NOT NULL,
    created_by          VARCHAR(50) NOT NULL,
    last_modified_at    DATETIME    NOT NULL,
    last_modified_by    VARCHAR(50) NOT NULL,
    PRIMARY KEY (plugin_id),
    UNIQUE KEY unique_name(name),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);