-- noinspection SpellCheckingInspectionForFile
CREATE TABLE topic_dqc_rule_daily
(
    id_          NUMBER(20),
    rulecode     VARCHAR2(50),
    topicid      VARCHAR2(50),
    factorid     VARCHAR2(50),
    year         NUMBER(5),
    month        NUMBER(3),
    day          NUMBER(3),
    processdate  DATE,
    count        NUMBER(10),
    tenant_id_   VARCHAR(50) NOT NULL,
    insert_time_ DATE        NOT NULL,
    update_time_ DATE        NOT NULL,
    CONSTRAINT pk_topic_dqc_rule_daily PRIMARY KEY (id_)
);
CREATE INDEX i_topic_dqc_rule_daily_1 ON topic_dqc_rule_daily (rulecode);
CREATE INDEX i_topic_dqc_rule_daily_2 ON topic_dqc_rule_daily (topicid);
CREATE INDEX i_topic_dqc_rule_daily_3 ON topic_dqc_rule_daily (factorid);
CREATE INDEX i_topic_dqc_rule_daily_4 ON topic_dqc_rule_daily (year);
CREATE INDEX i_topic_dqc_rule_daily_5 ON topic_dqc_rule_daily (month);
CREATE INDEX i_topic_dqc_rule_daily_6 ON topic_dqc_rule_daily (day);
CREATE INDEX i_topic_dqc_rule_daily_7 ON topic_dqc_rule_daily (processdate);
CREATE INDEX i_topic_dqc_rule_daily_8 ON topic_dqc_rule_daily (tenant_id_);
CREATE INDEX i_topic_dqc_rule_daily_9 ON topic_dqc_rule_daily (update_time_);
