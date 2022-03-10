-- noinspection SpellCheckingInspectionForFile
CREATE TABLE topic_raw_pipeline_monitor_log
(
    id_          NUMBER(20),
    data_        CLOB,
    traceid      VARCHAR2(50),
    pipelineid   VARCHAR2(50),
    topicid      VARCHAR2(50),
    dataid       NUMBER(20),
    status       VARCHAR2(10),
    starttime    DATE,
    spentinmills NUMBER(20),
    tenant_id_   VARCHAR2(50) NOT NULL,
    insert_time_ DATE         NOT NULL,
    update_time_ DATE         NOT NULL,
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