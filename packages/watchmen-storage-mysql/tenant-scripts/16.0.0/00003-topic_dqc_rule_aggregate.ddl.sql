# noinspection SpellCheckingInspectionForFile
CREATE TABLE topic_dqc_rule_aggregate
(
    id_               BIGINT,
    rulecode          VARCHAR(50),
    topicid           VARCHAR(50),
    factorid          VARCHAR(50),
    count             DECIMAL(10),
    aggregate_assist_ JSON,
    version_          INT,
    tenant_id_        VARCHAR(50) NOT NULL,
    insert_time_      DATETIME    NOT NULL,
    update_time_      DATETIME    NOT NULL,
    PRIMARY KEY (id_),
    INDEX (rulecode),
    INDEX (topicid),
    INDEX (factorid),
    INDEX (tenant_id_)
);
