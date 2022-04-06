# noinspection SpellCheckingInspectionForFile
CREATE TABLE topic_dqc_rule_daily
(
    id_          BIGINT,
    rulecode     VARCHAR(50),
    topicid      VARCHAR(50),
    factorid     VARCHAR(50),
    year         DECIMAL(5),
    month        DECIMAL(3),
    day          DECIMAL(3),
    processdate  DATETIME,
    count        DECIMAL(10),
    tenant_id_   VARCHAR(50) NOT NULL,
    insert_time_ DATETIME    NOT NULL,
    update_time_ DATETIME    NOT NULL,
    PRIMARY KEY (id_),
    INDEX (rulecode),
    INDEX (topicid),
    INDEX (factorid),
    INDEX (year),
    INDEX (month),
    INDEX (day),
    INDEX (processdate),
    INDEX (tenant_id_),
    INDEX (update_time_)
);
