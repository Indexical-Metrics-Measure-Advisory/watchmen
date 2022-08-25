CREATE TABLE oss_collector_competitive_lock
(
    lock_id        VARCHAR(50) NOT NULL,
    resource_id    VARCHAR(500) NOT NULL,
    model_name     VARCHAR(20) NOT NULL,
    object_id      VARCHAR(100) NOT NULL,
    registered_at  TIMESTAMP   NOT NULL,
    CONSTRAINT pk_oss_collector_competitive_lock PRIMARY KEY (lock_id)
);
CREATE UNIQUE INDEX u_oss_collector_competitive_lock_1 ON oss_collector_competitive_lock (model_name, object_id);