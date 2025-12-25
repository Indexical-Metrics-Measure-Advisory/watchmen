CREATE TABLE subscription_event_locks
(
    subscription_event_lock_id VARCHAR(50) NOT NULL,
    subscription_event_id      VARCHAR(50) NOT NULL,
    user_id                    VARCHAR(50) NOT NULL,
    tenant_id                  VARCHAR(50) NOT NULL,
    status                     VARCHAR(10) NOT NULL,
    created_at                 DATETIME    NOT NULL,
    process_date               DATETIME    NOT NULL,
    PRIMARY KEY (subscription_event_lock_id),
    INDEX (tenant_id),
    INDEX (user_id),
    INDEX (subscription_event_id),
    INDEX (created_at),
    INDEX (process_date)
);
