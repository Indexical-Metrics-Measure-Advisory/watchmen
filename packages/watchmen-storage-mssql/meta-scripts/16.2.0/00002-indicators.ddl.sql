CREATE TABLE indicators
(
    indicator_id        NVARCHAR(50) NOT NULL,
    name                NVARCHAR(50),
    topic_or_subject_id NVARCHAR(50),
    base_on             NVARCHAR(10),
    factor_id           NVARCHAR(50),
    category_1          NVARCHAR(100),
    category_2          NVARCHAR(100),
    category_3          NVARCHAR(100),
    value_buckets       NVARCHAR(2048),
    relevants           NVARCHAR(MAX),
    group_ids           NVARCHAR(MAX),
    filter              NVARCHAR(MAX),
    description         NVARCHAR(1024),
    tenant_id           NVARCHAR(50) NOT NULL,
    created_at          DATETIME     NOT NULL,
    created_by          NVARCHAR(50) NOT NULL,
    last_modified_at    DATETIME     NOT NULL,
    last_modified_by    NVARCHAR(50) NOT NULL,
    version             DECIMAL(20),
    CONSTRAINT pk_indicators PRIMARY KEY (indicator_id)
);
CREATE INDEX i_indicators_1 ON indicators (name);
CREATE INDEX i_indicators_2 ON indicators (topic_or_subject_id);
CREATE INDEX i_indicators_3 ON indicators (base_on)
CREATE INDEX i_indicators_4 ON indicators (category_1);
CREATE INDEX i_indicators_5 ON indicators (category_2);
CREATE INDEX i_indicators_6 ON indicators (category_3);
CREATE INDEX i_indicators_7 ON indicators (tenant_id);
CREATE INDEX i_indicators_8 ON indicators (created_at);
CREATE INDEX i_indicators_9 ON indicators (created_by);
CREATE INDEX i_indicators_10 ON indicators (last_modified_at);
CREATE INDEX i_indicators_11 ON indicators (last_modified_by);
