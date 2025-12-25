CREATE TABLE oss_collector_competitive_lock
(
    lock_id        VARCHAR(50) NOT NULL,
    resource_id    VARCHAR(500) NOT NULL,
    model_name     VARCHAR(20) NOT NULL,
    object_id      VARCHAR(100) NOT NULL,
    registered_at  DATETIME   NOT NULL,
    PRIMARY KEY (lock_id),
    UNIQUE KEY unique_resource(model_name, object_id)
);
