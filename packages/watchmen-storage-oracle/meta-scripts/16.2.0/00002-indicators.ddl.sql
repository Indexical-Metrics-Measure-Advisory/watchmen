CREATE TABLE indicators
(
    indicator_id        VARCHAR2(50) NOT NULL,
    name                VARCHAR2(50),
    topic_or_subject_id VARCHAR2(50),
    base_on             VARCHAR2(10),
    factor_id           VARCHAR2(50),
    category_1          VARCHAR2(100),
    category_2          VARCHAR2(100),
    category_3          VARCHAR2(100),
    value_buckets       VARCHAR2(2048),
    relevants           CLOB,
    group_ids           VARCHAR2(2048),
    filter              CLOB,
    description         VARCHAR2(1024),
    tenant_id           VARCHAR2(50) NOT NULL,
    created_at          DATE         NOT NULL,
    created_by          VARCHAR2(50) NOT NULL,
    last_modified_at    DATE         NOT NULL,
    last_modified_by    VARCHAR2(50) NOT NULL,
    version             NUMBER(20),
    CONSTRAINT pk_indicators PRIMARY KEY (indicator_id)
);
CREATE INDEX i_indicators_1 ON indicators (name);
CREATE INDEX i_indicators_2 ON indicators (topic_or_subject_id);
CREATE INDEX i_indicators_3 ON indicators (base_on);
CREATE INDEX i_indicators_4 ON indicators (category_1);
CREATE INDEX i_indicators_5 ON indicators (category_2);
CREATE INDEX i_indicators_6 ON indicators (category_3);
CREATE INDEX i_indicators_7 ON indicators (tenant_id);
CREATE INDEX i_indicators_8 ON indicators (created_at);
CREATE INDEX i_indicators_9 ON indicators (created_by);
CREATE INDEX i_indicators_10 ON indicators (last_modified_at);
CREATE INDEX i_indicators_11 ON indicators (last_modified_by);
