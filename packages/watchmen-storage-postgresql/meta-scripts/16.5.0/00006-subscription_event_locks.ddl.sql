CREATE TABLE subscription_event_locks
(
    subscription_event_lock_id VARCHAR(50) NOT NULL,
    subscription_event_id      VARCHAR(50) NOT NULL,
    user_id                    VARCHAR(50) NOT NULL,
    tenant_id                  VARCHAR(50) NOT NULL,
    status                     VARCHAR(10) NOT NULL,
    created_at                 TIMESTAMP   NOT NULL,
    process_date               TIMESTAMP   NOT NULL,
    CONSTRAINT pk_subscription_event_locks PRIMARY KEY (subscription_event_lock_id)
);
CREATE INDEX i_subscription_event_locks_1 ON subscription_event_locks (tenant_id);
CREATE INDEX i_subscription_event_locks_2 ON subscription_event_locks (user_id);
CREATE INDEX i_subscription_event_locks_3 ON subscription_event_locks (created_at);
CREATE INDEX i_subscription_event_locks_4 ON subscription_event_locks (status);
CREATE INDEX i_subscription_event_locks_5 ON subscription_event_locks (subscription_event_id);
CREATE INDEX i_subscription_event_locks_6 ON subscription_event_locks (process_date);
