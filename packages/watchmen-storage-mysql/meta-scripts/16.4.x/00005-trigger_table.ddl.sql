CREATE TABLE trigger_table
(
    table_trigger_id    BIGINT       NOT NULL,
    table_name          VARCHAR(500) NOT NULL,
    data_count          int,
    model_name          VARCHAR(500) NOT NULL,
    is_extracted        TINYINT  NOT NULL,
    is_finished         TINYINT  NOT NULL,
    model_trigger_id    VARCHAR(50) NOT NULL,
    event_trigger_id    VARCHAR(50) NOT NULL,
    tenant_id           VARCHAR(50) NOT NULL,
    created_at          DATETIME    NOT NULL,
    created_by          VARCHAR(50) NOT NULL,
    last_modified_at    DATETIME    NOT NULL,
    last_modified_by    VARCHAR(50) NOT NULL,
    PRIMARY KEY (table_trigger_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);