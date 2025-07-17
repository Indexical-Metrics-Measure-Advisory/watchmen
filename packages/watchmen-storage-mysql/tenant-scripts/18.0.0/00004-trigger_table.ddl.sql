CREATE TABLE trigger_table
(
    table_trigger_id    BIGINT          NOT NULL,
    table_name          VARCHAR(50)    NOT NULL,
    data_count          BIGINT,
    model_name          VARCHAR(50)     NOT NULL,
    is_extracted        TINYINT         NOT NULL,
    result              JSON,
    model_trigger_id    BIGINT          NOT NULL,
    module_trigger_id   BIGINT          NOT NULL,
    event_trigger_id    BIGINT          NOT NULL,
    tenant_id           VARCHAR(50)     NOT NULL,
    created_at          DATETIME        NOT NULL,
    created_by          VARCHAR(50)     NOT NULL,
    last_modified_at    DATETIME        NOT NULL,
    last_modified_by    VARCHAR(50)     NOT NULL,
    PRIMARY KEY (table_trigger_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by),
    INDEX (model_trigger_id)
);