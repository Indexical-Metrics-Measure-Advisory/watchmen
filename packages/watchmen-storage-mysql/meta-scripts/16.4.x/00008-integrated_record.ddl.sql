CREATE TABLE integrated_record
(
    integrated_record_id    BIGINT      NOT NULL,
    resource_id             VARCHAR(50) NOT NULL,
    data_content            JSON,
    model_name              VARCHAR(50) NOT NULL,
    object_id               VARCHAR(50) NOT NULL,
	dependency              JSON,
	need_merge_json         TINYINT,
	root_node               JSON,
    tenant_id               VARCHAR(50) NOT NULL,
    created_at              DATETIME    NOT NULL,
    created_by              VARCHAR(50) NOT NULL,
    last_modified_at        DATETIME    NOT NULL,
    last_modified_by        VARCHAR(50) NOT NULL,
    PRIMARY KEY (integrated_record_id),
    UNIQUE KEY unique_name(resource_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);