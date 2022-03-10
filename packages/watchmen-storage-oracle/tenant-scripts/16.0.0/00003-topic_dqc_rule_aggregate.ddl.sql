-- noinspection SpellCheckingInspectionForFile
CREATE TABLE topic_dqc_rule_aggregate
(
    id_               NUMBER(20),
    rulecode          VARCHAR2(50),
    topicid           VARCHAR2(50),
    factorid          VARCHAR2(50),
    count             NUMBER(10),
    aggregate_assist_ VARCHAR2(1024),
    version_          INT,
    tenant_id_        VARCHAR(50) NOT NULL,
    insert_time_      DATE        NOT NULL,
    update_time_      DATE        NOT NULL,
    CONSTRAINT pk_topic_dqc_rule_aggregate PRIMARY KEY (id_)
);
CREATE INDEX i_topic_dqc_rule_aggregate_1 ON topic_dqc_rule_aggregate (rulecode);
CREATE INDEX i_topic_dqc_rule_aggregate_2 ON topic_dqc_rule_aggregate (topicid);
CREATE INDEX i_topic_dqc_rule_aggregate_3 ON topic_dqc_rule_aggregate (factorid);
CREATE INDEX i_topic_dqc_rule_aggregate_4 ON topic_dqc_rule_aggregate (tenant_id_);
CREATE INDEX i_topic_dqc_rule_aggregate_5 ON topic_dqc_rule_aggregate (update_time_);
