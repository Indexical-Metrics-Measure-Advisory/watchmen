CREATE TABLE notification_definitions
(
    notification_id VARCHAR2(50) NOT NULL,
    type            VARCHAR2(50) NOT NULL,
    user_id         VARCHAR2(50) NOT NULL,
    tenant_id        VARCHAR2(50) NOT NULL,
    params           CLOB,
    created_at       DATE    NOT NULL,
    created_by       VARCHAR2(50) NOT NULL,
    last_modified_at DATE    NOT NULL,
    last_modified_by VARCHAR2(50) NOT NULL,
    version          NUMBER(20)
    CONSTRAINT pk_notification_definitions PRIMARY KEY (notification_id)
);

CREATE INDEX i_notification_definitions_1 ON notification_definitions (tenant_id);
CREATE INDEX i_notification_definitions_2 ON notification_definitions (user_id);
CREATE INDEX i_notification_definitions_3 ON notification_definitions (created_at);
CREATE INDEX i_notification_definitions_4 ON notification_definitions (created_by);
CREATE INDEX i_notification_definitions_5 ON notification_definitions (last_modified_at);
CREATE INDEX i_notification_definitions_6 ON notification_definitions (last_modified_by);

