# noinspection SpellCheckingInspectionForFile
CREATE TABLE topic_raw_pipeline_monitor_log
(
    id_          BIGINT,
    data_        JSON,
    traceid      VARCHAR(50),
    pipelineid   VARCHAR(50),
    topicid      VARCHAR(50),
    dataid       DECIMAL(20),
    status       VARCHAR(10),
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
