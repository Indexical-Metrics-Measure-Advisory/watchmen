CREATE TABLE user_groups
(
    user_group_id    VARCHAR(50) NOT NULL,
    name             VARCHAR(50) NOT NULL,
    description      VARCHAR(1024),
    user_ids         JSON,
    space_ids        JSON,
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       DATETIME    NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at DATETIME    NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          BIGINT,
    PRIMARY KEY (user_group_id),
    INDEX (name),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
