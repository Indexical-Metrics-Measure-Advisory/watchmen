CREATE TABLE subscription_event_locks
(
    subscription_event_lock_id NVARCHAR(50) NOT NULL,
    subscription_event_id      NVARCHAR(50) NOT NULL,
    user_id                    NVARCHAR(50) NOT NULL,
    tenant_id                  NVARCHAR(50) NOT NULL,
    status                     NVARCHAR(10) NOT NULL,
    created_at                 DATETIME     NOT NULL,
    process_date               DATETIME     NOT NULL,
    CONSTRAINT pk_subscription_event_locks PRIMARY KEY (subscription_event_lock_id)
);
CREATE INDEX i_subscription_event_locks_1 ON subscription_event_locks (tenant_id);
CREATE INDEX i_subscription_event_locks_2 ON subscription_event_locks (user_id);
CREATE INDEX i_subscription_event_locks_3 ON subscription_event_locks (created_at);
CREATE INDEX i_subscription_event_locks_4 ON subscription_event_locks (subscription_event_id);
CREATE INDEX i_subscription_event_locks_5 ON subscription_event_locks (process_date);
