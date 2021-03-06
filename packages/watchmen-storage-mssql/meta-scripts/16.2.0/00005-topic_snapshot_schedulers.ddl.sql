CREATE TABLE snapshot_schedulers
(
    scheduler_id      NVARCHAR(50) NOT NULL,
    topic_id          NVARCHAR(50) NOT NULL,
    target_topic_name NVARCHAR(50) NOT NULL,
    target_topic_id   NVARCHAR(50) NOT NULL,
    pipeline_id       NVARCHAR(50) NOT NULL,
    frequency         NVARCHAR(20) NOT NULL,
    filter            NVARCHAR(MAX),
    weekday           NVARCHAR(10),
    day               NVARCHAR(10),
    hour              DECIMAL(2),
    minute            DECIMAL(2),
    enabled           DECIMAL(1),
    tenant_id         NVARCHAR(50) NOT NULL,
    created_at        DATETIME     NOT NULL,
    created_by        NVARCHAR(50) NOT NULL,
    last_modified_at  DATETIME     NOT NULL,
    last_modified_by  NVARCHAR(50) NOT NULL,
    version           DECIMAL(20),
    CONSTRAINT pk_snapshot_schedulers PRIMARY KEY (scheduler_id)
);
CREATE INDEX i_snapshot_schedulers_1 ON snapshot_schedulers (topic_id);
CREATE INDEX i_snapshot_schedulers_2 ON snapshot_schedulers (target_topic_id);
CREATE INDEX i_snapshot_schedulers_3 ON snapshot_schedulers (tenant_id);
CREATE INDEX i_snapshot_schedulers_4 ON snapshot_schedulers (created_at);
CREATE INDEX i_snapshot_schedulers_5 ON snapshot_schedulers (created_by);
CREATE INDEX i_snapshot_schedulers_6 ON snapshot_schedulers (last_modified_at);
CREATE INDEX i_snapshot_schedulers_7 ON snapshot_schedulers (last_modified_by);
