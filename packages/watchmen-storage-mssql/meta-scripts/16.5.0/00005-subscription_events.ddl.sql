CREATE TABLE subscription_events
(
    subscription_event_id NVARCHAR(50) NOT NULL,
    notification_id       NVARCHAR(50) NOT NULL,
    event_id              NVARCHAR(50) NOT NULL,
    tenant_id             NVARCHAR(50) NOT NULL,
    user_id               NVARCHAR(50) NOT NULL,
    source_id             NVARCHAR(50) NOT NULL,
    weekday               NVARCHAR(10),
    day                   NVARCHAR(10),
    hour                  DECIMAL(2),
    minute                DECIMAL(2),
    enabled               DECIMAL(1),
    status                DECIMAL(1),
    created_at            DATETIME     NOT NULL,
    created_by            NVARCHAR(50) NOT NULL,
    last_modified_at      DATETIME     NOT NULL,
    last_modified_by      NVARCHAR(50) NOT NULL,
    version               DECIMAL(20),
    CONSTRAINT pk_subscription_events PRIMARY KEY (subscription_event_id)
);
CREATE INDEX i_subscription_events_1 ON subscription_events (tenant_id);
CREATE INDEX i_subscription_events_2 ON subscription_events (user_id);
CREATE INDEX i_subscription_events_3 ON subscription_events (created_at);
CREATE INDEX i_subscription_events_4 ON subscription_events (created_by);
CREATE INDEX i_subscription_events_5 ON subscription_events (last_modified_at);
CREATE INDEX i_subscription_events_6 ON subscription_events (last_modified_by);
CREATE INDEX i_subscription_events_7 ON subscription_events (status);
CREATE INDEX i_subscription_events_8 ON subscription_events (notification_id);
CREATE INDEX i_subscription_events_9 ON subscription_events (source_id);
