CREATE TABLE snapshot_schedulers
(
    scheduler_id      VARCHAR2(50) NOT NULL,
    topic_id          VARCHAR2(50) NOT NULL,
    target_topic_name VARCHAR2(50) NOT NULL,
    target_topic_id   VARCHAR2(50) NOT NULL,
    pipeline_id       VARCHAR2(50) NOT NULL,
    frequency         VARCHAR2(20) NOT NULL,
    filter            CLOB,
    weekday           VARCHAR2(10),
    day               VARCHAR2(10),
    hour              NUMBER(2),
    minute            NUMBER(2),
    enabled           NUMBER(1),
    tenant_id         VARCHAR2(50) NOT NULL,
    created_at        DATE         NOT NULL,
    created_by        VARCHAR2(50) NOT NULL,
    last_modified_at  DATE         NOT NULL,
    last_modified_by  VARCHAR2(50) NOT NULL,
    version           NUMBER(20),
    CONSTRAINT pk_snapshot_schedulers PRIMARY KEY (scheduler_id)
);
CREATE INDEX i_snapshot_schedulers_1 ON snapshot_schedulers (topic_id);
CREATE INDEX i_snapshot_schedulers_2 ON snapshot_schedulers (target_topic_id);
CREATE INDEX i_snapshot_schedulers_3 ON snapshot_schedulers (tenant_id);
CREATE INDEX i_snapshot_schedulers_4 ON snapshot_schedulers (created_at);
CREATE INDEX i_snapshot_schedulers_5 ON snapshot_schedulers (created_by);
CREATE INDEX i_snapshot_schedulers_6 ON snapshot_schedulers (last_modified_at);
CREATE INDEX i_snapshot_schedulers_7 ON snapshot_schedulers (last_modified_by);
