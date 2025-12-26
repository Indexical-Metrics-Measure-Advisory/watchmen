CREATE TABLE notification_definitions
(
    notification_id  VARCHAR(50) NOT NULL,
    type             VARCHAR(50) NOT NULL,
    user_id          VARCHAR(50) NOT NULL,
    tenant_id        VARCHAR(50) NOT NULL,
    params           JSON,
    created_at       DATETIME    NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at DATETIME    NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          BIGINT,
    PRIMARY KEY (notification_id),
    INDEX (tenant_id),
    INDEX (user_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
