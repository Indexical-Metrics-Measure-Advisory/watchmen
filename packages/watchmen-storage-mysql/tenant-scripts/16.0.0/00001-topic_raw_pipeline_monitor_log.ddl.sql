# noinspection SpellCheckingInspectionForFile
CREATE TABLE topic_raw_pipeline_monitor_log
(
    id_          BIGINT,
    data_        JSON,
    traceid      VARCHAR(50) NOT NULL,
    pipelineid   VARCHAR(50) NOT NULL,
    topicid      VARCHAR(50) NOT NULL,
    dataid       BIGINT      NOT NULL,
    status       VARCHAR(10) NOT NULL,
    starttime    DATETIME,
    spentinmills BIGINT,
    tenant_id_   VARCHAR(50) NOT NULL,
    insert_time_ DATETIME    NOT NULL,
    update_time_ DATETIME    NOT NULL,
    PRIMARY KEY (id_),
    INDEX (traceid),
    INDEX (pipelineid),
    INDEX (topicid),
    INDEX (dataid),
    INDEX (status),
    INDEX (starttime),
    INDEX (tenant_id_)
);
