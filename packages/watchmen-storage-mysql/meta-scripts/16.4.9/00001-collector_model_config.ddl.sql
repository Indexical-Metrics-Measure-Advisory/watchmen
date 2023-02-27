CREATE TABLE collector_model_config
(
    model_id            VARCHAR(50)     NOT NULL,
    model_name          VARCHAR(50)    NOT NULL,
    depend_on           JSON,
    raw_topic_code      VARCHAR(50)     NOT NULL,
    is_paralleled       TINYINT,
    version             BIGINT,
    tenant_id           VARCHAR(50)     NOT NULL,
    created_at          DATETIME        NOT NULL,
    created_by          VARCHAR(50)     NOT NULL,
    last_modified_at    DATETIME        NOT NULL,
    last_modified_by    VARCHAR(50)     NOT NULL,
    PRIMARY KEY (model_id),
    UNIQUE KEY unique_name(model_name),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);