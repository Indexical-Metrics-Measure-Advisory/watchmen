DROP TABLE collector_competitive_lock;

CREATE TABLE competitive_lock
(
    lock_id        NUMBER(20)           NOT NULL,
    resource_id    VARCHAR2(500)        NOT NULL,
    registered_at  DATE                 NOT NULL,
    tenant_id      VARCHAR2(50)         NOT NULL,
    CONSTRAINT pk_competitive_lock PRIMARY KEY (lock_id)
);
CREATE UNIQUE INDEX u_competitive_lock_1 ON competitive_lock (resource_id);
