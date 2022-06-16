-- noinspection SpellCheckingInspectionForFile
CREATE TABLE topic_raw_pipeline_monitor_log
(
    id_          BIGINT,
    data_        NVARCHAR(MAX),
    traceid      NVARCHAR(50),
    pipelineid   NVARCHAR(50),
    topicid      NVARCHAR(50),
    dataid       DECIMAL(20),
    status       NVARCHAR(10),
    starttime    DATETIME,
    spentinmills BIGINT,
    tenant_id_   NVARCHAR(50) NOT NULL,
    insert_time_ DATETIME     NOT NULL,
    update_time_ DATETIME     NOT NULL,
    CONSTRAINT pk_topic_raw_pipeline_monitor_log PRIMARY KEY (id_)
);
CREATE INDEX i_topic_raw_pipeline_monitor_log_1 ON topic_raw_pipeline_monitor_log (traceid);
CREATE INDEX i_topic_raw_pipeline_monitor_log_2 ON topic_raw_pipeline_monitor_log (pipelineid);
CREATE INDEX i_topic_raw_pipeline_monitor_log_3 ON topic_raw_pipeline_monitor_log (topicid);
CREATE INDEX i_topic_raw_pipeline_monitor_log_4 ON topic_raw_pipeline_monitor_log (dataid);
CREATE INDEX i_topic_raw_pipeline_monitor_log_5 ON topic_raw_pipeline_monitor_log (status);
CREATE INDEX i_topic_raw_pipeline_monitor_log_6 ON topic_raw_pipeline_monitor_log (starttime);
CREATE INDEX i_topic_raw_pipeline_monitor_log_7 ON topic_raw_pipeline_monitor_log (tenant_id_);
CREATE INDEX i_topic_raw_pipeline_monitor_log_8 ON topic_raw_pipeline_monitor_log (update_time_);