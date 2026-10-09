CREATE TABLE metric_materializations
(
    id                 NVARCHAR(50)  NOT NULL,
    name               NVARCHAR(200),
    metric_id          NVARCHAR(50)  NOT NULL,
    metric_name        NVARCHAR(255) NOT NULL,
    metric_label       NVARCHAR(255),
    target_topic_id    NVARCHAR(50),
    target_topic_name  NVARCHAR(200),
    auto_create_topic  SMALLINT      NOT NULL,
    time_grain         NVARCHAR(10)  NOT NULL,
    group_by           NVARCHAR(MAX),
    write_mode         NVARCHAR(20)  NOT NULL,
    engine             NVARCHAR(20)  NOT NULL,
    frequency          NVARCHAR(20),
    time               NVARCHAR(10),
    [date]             NVARCHAR(20),
    weekday            NVARCHAR(10),
    day_of_month       INT,
    schedule_enabled   SMALLINT      NOT NULL,
    enabled            SMALLINT      NOT NULL,
    factor_mapping     NVARCHAR(MAX),
    description        NVARCHAR(1024),
    tenant_id          NVARCHAR(50)  NOT NULL,
    created_at         DATETIME      NOT NULL,
    created_by         NVARCHAR(50)  NOT NULL,
    last_modified_at   DATETIME      NOT NULL,
    last_modified_by   NVARCHAR(50)  NOT NULL,
    user_id            NVARCHAR(50)  NOT NULL,
    CONSTRAINT pk_metric_materializations PRIMARY KEY (id)
);
CREATE INDEX i_metric_materializations_1 ON metric_materializations (metric_id);
CREATE INDEX i_metric_materializations_2 ON metric_materializations (target_topic_id);
CREATE INDEX i_metric_materializations_3 ON metric_materializations (tenant_id);
CREATE INDEX i_metric_materializations_4 ON metric_materializations (user_id);
