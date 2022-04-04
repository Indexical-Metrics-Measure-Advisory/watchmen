CREATE TABLE topic_dqc_rule_aggregate
(
    id_               BIGINT ,
    rulecode          NVARCHAR(50),
    topicid           NVARCHAR(50),
    factorid          NVARCHAR(50),
    count             DECIMAL(10),
    aggregate_assist_ NVARCHAR(MAX),
    version_          INT,
    tenant_id_        NVARCHAR(50) NOT NULL,
    insert_time_      DATETIME    NOT NULL,
    update_time_      DATETIME    NOT NULL,
    CONSTRAINT pk_topic_dqc_raw_rule_result PRIMARY KEY (id_)
);
CREATE INDEX i_topic_dqc_rule_aggregate_1 ON topic_dqc_rule_aggregate (rulecode);
CREATE INDEX i_topic_dqc_rule_aggregate_2 ON topic_dqc_rule_aggregate (topicid);
CREATE INDEX i_topic_dqc_rule_aggregate_3 ON topic_dqc_rule_aggregate (factorid);
CREATE INDEX i_topic_dqc_rule_aggregate_4 ON topic_dqc_rule_aggregate (tenant_id_);
CREATE INDEX i_topic_dqc_rule_aggregate_5 ON topic_dqc_rule_aggregate (update_time_);
