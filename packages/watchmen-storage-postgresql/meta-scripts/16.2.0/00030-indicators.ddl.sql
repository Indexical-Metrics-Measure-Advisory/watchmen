CREATE TABLE indicators
(
    indicator_id        VARCHAR(50) NOT NULL,
    name                VARCHAR(50),
    topic_or_subject_id VARCHAR(50),
    base_on             VARCHAR(10),
    filter              JSON,
    factor_id           VARCHAR(50),
    category_1          VARCHAR(100),
    category_2          VARCHAR(100),
    category_3          VARCHAR(100),
    value_buckets       VARCHAR(2048),
    relevants           JSON,
    description         VARCHAR(1024),
    group_ids           JSON,
    tenant_id           VARCHAR(50) NOT NULL,
    created_at          TIMESTAMP   NOT NULL,
    created_by          VARCHAR(50) NOT NULL,
    last_modified_at    TIMESTAMP   NOT NULL,
    last_modified_by    VARCHAR(50) NOT NULL,
    version             DECIMAL(20),
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
