CREATE TABLE publish_notification_setting
(
    setting_id       VARCHAR(50) NOT NULL,
    enabled          BOOLEAN     NOT NULL,
    resources        JSON,
    type             VARCHAR(50),
    url              VARCHAR(1024),
    secret           VARCHAR(512),
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       DATETIME    NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at DATETIME    NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          BIGINT,
    PRIMARY KEY (setting_id),
    INDEX (tenant_id)
);
