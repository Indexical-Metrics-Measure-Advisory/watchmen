CREATE TABLE notification_definitions
(
    notification_id  VARCHAR(50) NOT NULL,
    type             VARCHAR(50) NOT NULL,
    user_id          VARCHAR(50) NOT NULL,
    tenant_id        VARCHAR(50) NOT NULL,
    params           JSON,
    created_at       TIMESTAMP   NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP   NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_notification_definitions PRIMARY KEY (notification_id)
);
CREATE INDEX i_notification_definitions_1 ON notification_definitions (tenant_id);
CREATE INDEX i_notification_definitions_2 ON notification_definitions (user_id);
CREATE INDEX i_notification_definitions_3 ON notification_definitions (created_at);
CREATE INDEX i_notification_definitions_4 ON notification_definitions (created_by);
CREATE INDEX i_notification_definitions_5 ON notification_definitions (last_modified_at);
CREATE INDEX i_notification_definitions_6 ON notification_definitions (last_modified_by);

