CREATE TABLE trigger_event
(
    event_trigger_id    BIGINT          NOT NULL,
    start_time          DATETIME        NOT NULL,
    end_time            DATETIME        NOT NULL,
    is_finished         TINYINT         NOT NULL,
    tenant_id           VARCHAR(50)     NOT NULL,
    created_at          DATETIME        NOT NULL,
    created_by          VARCHAR(50)     NOT NULL,
    last_modified_at    DATETIME        NOT NULL,
    last_modified_by    VARCHAR(50)     NOT NULL,
    PRIMARY KEY (event_trigger_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);