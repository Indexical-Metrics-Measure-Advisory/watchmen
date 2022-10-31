CREATE TABLE subscription_event_locks
(
    subscription_event_lock_id VARCHAR(50) NOT NULL,
    subscription_event_id            VARCHAR(50) NOT NULL,
    user_id         VARCHAR(50) NOT NULL,
    tenant_id        VARCHAR(50) NOT NULL,
    status           VARCHAR(10) NOT NULL,
    created_at       TIMESTAMP    NOT NULL,
    process_date     TIMESTAMP    NOT NULL,
    CONSTRAINT pk_subscription_event_locks PRIMARY KEY (subscription_event_lock_id)
    INDEX(tenant_id),
    INDEX(user_id),
    INDEX(subscription_event_id),
    INDEX (created_at),
    INDEX (process_date)
);

CREATE INDEX i_subscription_event_locks_1 ON notification_definitions (tenant_id);
CREATE INDEX i_subscription_event_locks_2 ON notification_definitions (user_id);
CREATE INDEX i_subscription_event_locks_3 ON notification_definitions (created_at);
CREATE INDEX i_subscription_event_locks_4 ON notification_definitions (subscription_event_id);
CREATE INDEX i_subscription_event_locks_5 ON notification_definitions (process_date);
