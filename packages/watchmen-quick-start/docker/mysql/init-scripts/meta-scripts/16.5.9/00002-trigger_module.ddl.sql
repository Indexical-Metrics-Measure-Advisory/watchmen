CREATE TABLE trigger_module
(
    module_trigger_id   BIGINT       NOT NULL,
    module_name         VARCHAR(50)  NOT NULL,
    is_finished         TINYINT      NOT NULL,
    priority            BIGINT       NOT NULL,
    event_trigger_id    BIGINT       NOT NULL,
    tenant_id           VARCHAR(50)  NOT NULL,
    created_at          DATETIME     NOT NULL,
    created_by          VARCHAR(50)  NOT NULL,
    last_modified_at    DATETIME     NOT NULL,
    last_modified_by    VARCHAR(50)  NOT NULL,
    PRIMARY KEY (module_trigger_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);