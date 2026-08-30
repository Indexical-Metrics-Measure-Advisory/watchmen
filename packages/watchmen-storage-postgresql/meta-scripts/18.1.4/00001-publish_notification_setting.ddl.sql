CREATE TABLE publish_notification_setting
(
    setting_id       VARCHAR(50)   NOT NULL,
    enabled          BOOLEAN       NOT NULL,
    resources        JSON,
    type             VARCHAR(50),
    url              VARCHAR(1024),
    secret           VARCHAR(512),
    tenant_id        VARCHAR(50)   NOT NULL,
    created_at       TIMESTAMP     NOT NULL,
    created_by       VARCHAR(50)   NOT NULL,
    last_modified_at TIMESTAMP     NOT NULL,
    last_modified_by VARCHAR(50)   NOT NULL,
    version          BIGINT,
    PRIMARY KEY (setting_id)
);
CREATE INDEX i_publish_notification_setting_1 ON publish_notification_setting (tenant_id);
