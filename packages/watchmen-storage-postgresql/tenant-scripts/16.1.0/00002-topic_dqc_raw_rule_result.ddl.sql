-- noinspection SpellCheckingInspectionForFile
CREATE TABLE topic_dqc_raw_rule_result
(
    id_          DECIMAL(20),
    data_        JSON,
    rulecode     VARCHAR(50),
    topicid      VARCHAR(50),
    factorid     VARCHAR(50),
    detected     SMALLINT,
    processdate  TIMESTAMP,
    tenant_id_   VARCHAR(50) NOT NULL,
    insert_time_ TIMESTAMP   NOT NULL,
    update_time_ TIMESTAMP   NOT NULL,
    CONSTRAINT pk_topic_dqc_raw_rule_result PRIMARY KEY (id_)
);
CREATE INDEX i_topic_dqc_raw_rule_result_1 ON topic_dqc_raw_rule_result (rulecode);
CREATE INDEX i_topic_dqc_raw_rule_result_2 ON topic_dqc_raw_rule_result (topicid);
CREATE INDEX i_topic_dqc_raw_rule_result_3 ON topic_dqc_raw_rule_result (factorid);
CREATE INDEX i_topic_dqc_raw_rule_result_4 ON topic_dqc_raw_rule_result (processdate);
CREATE INDEX i_topic_dqc_raw_rule_result_5 ON topic_dqc_raw_rule_result (tenant_id_);
CREATE INDEX i_topic_dqc_raw_rule_result_6 ON topic_dqc_raw_rule_result (update_time_);
