CREATE TABLE metric_materializations
(
    id                 VARCHAR2(50)  NOT NULL,
    name               VARCHAR2(200),
    metric_id          VARCHAR2(50)  NOT NULL,
    metric_name        VARCHAR2(255) NOT NULL,
    metric_label       VARCHAR2(255),
    target_topic_id    VARCHAR2(50),
    target_topic_name  VARCHAR2(200),
    auto_create_topic  NUMBER(1)     NOT NULL,
    time_grain         VARCHAR2(10)  NOT NULL,
    group_by           CLOB,
    write_mode         VARCHAR2(20)  NOT NULL,
    engine             VARCHAR2(20)  NOT NULL,
    frequency          VARCHAR2(20),
    time               VARCHAR2(10),
    "date"             VARCHAR2(20),
    weekday            VARCHAR2(10),
    day_of_month       NUMBER(10),
    schedule_enabled   NUMBER(1)     NOT NULL,
    enabled            NUMBER(1)     NOT NULL,
    factor_mapping     CLOB,
    description        VARCHAR2(1024),
    tenant_id          VARCHAR2(50)  NOT NULL,
    created_at         DATE          NOT NULL,
    created_by         VARCHAR2(50)  NOT NULL,
    last_modified_at   DATE          NOT NULL,
    last_modified_by   VARCHAR2(50)  NOT NULL,
    user_id            VARCHAR2(50)  NOT NULL,
    CONSTRAINT pk_metric_materializations PRIMARY KEY (id)
);
CREATE INDEX i_metric_materializations_1 ON metric_materializations (metric_id);
CREATE INDEX i_metric_materializations_2 ON metric_materializations (target_topic_id);
CREATE INDEX i_metric_materializations_3 ON metric_materializations (tenant_id);
CREATE INDEX i_metric_materializations_4 ON metric_materializations (user_id);
