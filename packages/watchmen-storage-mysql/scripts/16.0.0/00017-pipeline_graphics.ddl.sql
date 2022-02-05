CREATE TABLE pipeline_graphics
(
    pipeline_graphic_id VARCHAR(50) NOT NULL,
    name                VARCHAR(45) NOT NULL,
    topics              JSON,
    user_id             VARCHAR(50) NOT NULL,
    tenant_id           VARCHAR(50) NOT NULL,
    PRIMARY KEY (pipeline_graphic_id),
    INDEX (name),
    INDEX (user_id),
    INDEX (tenant_id)
);
