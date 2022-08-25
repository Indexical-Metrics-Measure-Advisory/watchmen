CREATE TABLE oss_collector_competitive_lock
(
    lock_id        VARCHAR2(50) NOT NULL,
    resource_id    VARCHAR2(500) NOT NULL,
    model_name     VARCHAR2(20) NOT NULL,
    object_id      VARCHAR2(100) NOT NULL,
    registered_at  DATE   NOT NULL,
    CONSTRAINT pk_oss_collector_competitive_lock PRIMARY KEY (lock_id)
);
CREATE UNIQUE INDEX u_oss_collector_competitive_lock_1 ON oss_collector_competitive_lock (model_name, object_id);