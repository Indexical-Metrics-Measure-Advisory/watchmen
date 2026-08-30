CREATE TABLE publish_notification_setting
(
    setting_id       NVARCHAR(50)  NOT NULL,
    enabled          BIT           NOT NULL,
    resources        NVARCHAR(MAX),
    type             NVARCHAR(50),
    url              NVARCHAR(1024),
    secret           NVARCHAR(512),
    tenant_id        NVARCHAR(50)  NOT NULL,
    created_at       DATETIME2     NOT NULL,
    created_by       NVARCHAR(50)  NOT NULL,
    last_modified_at DATETIME2     NOT NULL,
    last_modified_by NVARCHAR(50)  NOT NULL,
    version          BIGINT,
    CONSTRAINT pk_publish_notification_setting PRIMARY KEY (setting_id)
);
CREATE INDEX i_publish_notification_setting_1 ON publish_notification_setting (tenant_id);
