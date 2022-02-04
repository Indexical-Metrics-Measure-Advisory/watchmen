CREATE TABLE pipeline_graphics
(
    pipeline_graphic_id VARCHAR(50) NOT NULL,
    name                VARCHAR(45) NOT NULL,
    topics              JSON,
    user_id             VARCHAR(50) NOT NULL,
    tenant_id           VARCHAR(50) NOT NULL,
    created_at          DATETIME    NOT NULL,
    created_by          VARCHAR(50) NOT NULL,
    last_modified_at    DATETIME    NOT NULL,
    last_modified_by    VARCHAR(50) NOT NULL,
    version             BIGINT,
    PRIMARY KEY (pipeline_graphic_id),
    INDEX (name),
    INDEX (user_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
