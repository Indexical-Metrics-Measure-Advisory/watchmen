CREATE TABLE factor_index
(
    factor_index_id    VARCHAR(50)  NOT NULL,
    factor_id          VARCHAR(50)  NOT NULL,
    factor_type        VARCHAR(50)  NOT NULL,
    factor_name        VARCHAR(255) NOT NULL,
    factor_label       VARCHAR(255),
    factor_description VARCHAR(1024),
    topic_id           VARCHAR(50)  NOT NULL,
    topic_name         VARCHAR(50)  NOT NULL,
    tenant_id          VARCHAR(50)  NOT NULL,
    created_at         DATETIME     NOT NULL,
    last_modified_at   DATETIME     NOT NULL,
    PRIMARY KEY (factor_index_id),
    INDEX (factor_id),
    INDEX (factor_name),
    INDEX (topic_id),
    INDEX (topic_name),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (last_modified_at)
);
