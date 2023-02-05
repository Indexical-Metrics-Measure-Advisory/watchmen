CREATE TABLE change_data_json
(
    change_json_id      BIGINT      NOT NULL,
    model_name          VARCHAR(50) NOT NULL,
    object_id           VARCHAR(50) NOT NULL,
    table_name          VARCHAR(50) NOT NULL,
    data_id             VARCHAR(50) NOT NULL,
    content             JSON,
    depend_on           JSON,
    tenant_id           VARCHAR(50) NOT NULL,
    created_at          DATETIME    NOT NULL,
    created_by          VARCHAR(50) NOT NULL,
    last_modified_at    DATETIME    NOT NULL,
    last_modified_by    VARCHAR(50) NOT NULL,
    PRIMARY KEY (change_json_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);