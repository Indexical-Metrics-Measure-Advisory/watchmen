CREATE TABLE metric_materializations
(
    id                 VARCHAR(50)  NOT NULL,
    name               VARCHAR(200),
    metric_id          VARCHAR(50)  NOT NULL,
    metric_name        VARCHAR(255) NOT NULL,
    metric_label       VARCHAR(255),
    target_topic_id    VARCHAR(50),
    target_topic_name  VARCHAR(200),
    auto_create_topic  SMALLINT     NOT NULL,
    time_grain         VARCHAR(10)  NOT NULL,
    group_by           JSONB,
    write_mode         VARCHAR(20)  NOT NULL,
    engine             VARCHAR(20)  NOT NULL,
    frequency          VARCHAR(20),
    time               VARCHAR(10),
    date               VARCHAR(20),
    weekday            VARCHAR(10),
    day_of_month       INTEGER,
    schedule_enabled   SMALLINT     NOT NULL,
    enabled            SMALLINT     NOT NULL,
    factor_mapping     JSONB,
    description        VARCHAR(1024),
    tenant_id          VARCHAR(50)  NOT NULL,
    created_at         TIMESTAMP    NOT NULL,
    created_by         VARCHAR(50)  NOT NULL,
    last_modified_at   TIMESTAMP    NOT NULL,
    last_modified_by   VARCHAR(50)  NOT NULL,
    user_id            VARCHAR(50)  NOT NULL,
    CONSTRAINT pk_metric_materializations PRIMARY KEY (id)
);
CREATE INDEX i_metric_materializations_1 ON metric_materializations (metric_id);
CREATE INDEX i_metric_materializations_2 ON metric_materializations (target_topic_id);
CREATE INDEX i_metric_materializations_3 ON metric_materializations (tenant_id);
CREATE INDEX i_metric_materializations_4 ON metric_materializations (user_id);
