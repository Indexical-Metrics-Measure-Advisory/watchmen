# noinspection SpellCheckingInspectionForFile
CREATE TABLE topic_dqc_raw_rule_result
(
    id_          BIGINT,
    data_        JSON,
    rulecode     VARCHAR(50),
    topicid      VARCHAR(50),
    factorid     VARCHAR(50),
    detected     TINYINT,
    processdate  DATETIME,
    tenant_id_   VARCHAR(50) NOT NULL,
    insert_time_ DATETIME    NOT NULL,
    update_time_ DATETIME    NOT NULL,
    PRIMARY KEY (id_),
    INDEX (rulecode),
    INDEX (topicid),
    INDEX (factorid),
    INDEX (processdate),
    INDEX (tenant_id_)
);
