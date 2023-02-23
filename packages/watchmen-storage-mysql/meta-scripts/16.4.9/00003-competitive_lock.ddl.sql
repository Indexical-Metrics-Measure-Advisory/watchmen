DROP TABLE collector_competitive_lock;

CREATE TABLE competitive_lock
(
    lock_id        BIGINT           NOT NULL,
    resource_id    VARCHAR(500)     NOT NULL,
    registered_at  DATETIME         NOT NULL,
    tenant_id      VARCHAR(50)      NOT NULL,
    PRIMARY KEY (lock_id),
    UNIQUE KEY unique_resource(resource_id)
);
