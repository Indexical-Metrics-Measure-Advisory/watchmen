CREATE TABLE publish_notification_setting
(
    setting_id       VARCHAR2(50)  NOT NULL,
    enabled          NUMBER(1)     NOT NULL,
    resources        CLOB,
    type             VARCHAR2(50),
    url              VARCHAR2(1024),
    secret           VARCHAR2(512),
    tenant_id        VARCHAR2(50)  NOT NULL,
    created_at       DATE          NOT NULL,
    created_by       VARCHAR2(50)  NOT NULL,
    last_modified_at DATE          NOT NULL,
    last_modified_by VARCHAR2(50)  NOT NULL,
    version          NUMBER(20),
    CONSTRAINT pk_publish_notification_setting PRIMARY KEY (setting_id)
);
CREATE INDEX i_publish_notification_setting_1 ON publish_notification_setting (tenant_id);
