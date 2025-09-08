-- noinspection SpellCheckingInspectionForFile
CREATE TABLE topic_dqc_raw_rule_result
(
    id_          BIGINT,
    data_        NVARCHAR(MAX),
    rulecode     NVARCHAR(50),
    topicid      NVARCHAR(50),
    factorid     NVARCHAR(50),
    detected     TINYINT,
    processdate  DATETIME,
    tenant_id_   NVARCHAR(50) NOT NULL,
    insert_time_ DATETIME     NOT NULL,
    update_time_ DATETIME     NOT NULL,
    PRIMARY KEY (id_),
);
CREATE INDEX i_topic_dqc_raw_rule_result_1 ON topic_dqc_raw_rule_result (rulecode);
CREATE INDEX i_topic_dqc_raw_rule_result_2 ON topic_dqc_raw_rule_result (topicid);
CREATE INDEX i_topic_dqc_raw_rule_result_3 ON topic_dqc_raw_rule_result (factorid);
CREATE INDEX i_topic_dqc_raw_rule_result_4 ON topic_dqc_raw_rule_result (processdate);
CREATE INDEX i_topic_dqc_raw_rule_result_5 ON topic_dqc_raw_rule_result (tenant_id_);
CREATE INDEX i_topic_dqc_raw_rule_result_6 ON topic_dqc_raw_rule_result (update_time_);
