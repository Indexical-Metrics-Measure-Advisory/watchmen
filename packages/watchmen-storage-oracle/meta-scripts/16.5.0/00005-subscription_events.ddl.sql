CREATE TABLE subscription_events
(
    subscription_event_id VARCHAR2(50) NOT NULL,
    notification_id            VARCHAR2(50) NOT NULL,
    event_id         VARCHAR2(50) NOT NULL,
    tenant_id        VARCHAR2(50) NOT NULL,
    user_id          VARCHAR2(50) NOT NULL,
    source_id          VARCHAR2(50) NOT NULL,
    weekday           VARCHAR2(10),
    day               VARCHAR2(10),
    frequency         VARCHAR2(10),
    hour              NUMBER(10),
    minute            NUMBER(10),
    enabled           NUMBER(10),
    status            NUMBER(10),
    created_at       DATE    NOT NULL,
    created_by       VARCHAR2(50) NOT NULL,
    last_modified_at DATE    NOT NULL,
    last_modified_by VARCHAR2(50) NOT NULL,
    version          NUMBER(20),
    CONSTRAINT pk_subscription_events PRIMARY KEY (subscription_event_id)
);


CREATE INDEX i_subscription_events_1 ON notification_definitions (tenant_id);
CREATE INDEX i_subscription_events_2 ON notification_definitions (user_id);
CREATE INDEX i_subscription_events_3 ON notification_definitions (created_at);
CREATE INDEX i_subscription_events_4 ON notification_definitions (created_by);
CREATE INDEX i_subscription_events_5 ON notification_definitions (last_modified_at);
CREATE INDEX i_subscription_events_6 ON notification_definitions (last_modified_by);
CREATE INDEX i_subscription_events_7 ON notification_definitions (status);
CREATE INDEX i_subscription_events_8 ON notification_definitions (notification_id);
CREATE INDEX i_subscription_events_9 ON notification_definitions (source_id);