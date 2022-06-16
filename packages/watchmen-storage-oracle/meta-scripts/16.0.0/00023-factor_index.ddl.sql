CREATE TABLE factor_index
(
    factor_index_id    VARCHAR2(50)  NOT NULL,
    factor_id          VARCHAR2(50)  NOT NULL,
    factor_type        VARCHAR2(50)  NOT NULL,
    factor_name        VARCHAR2(255) NOT NULL,
    factor_label       VARCHAR2(255),
    factor_description VARCHAR2(1024),
    topic_id           VARCHAR2(50)  NOT NULL,
    topic_name         VARCHAR2(50)  NOT NULL,
    tenant_id          VARCHAR2(50)  NOT NULL,
    created_at         DATE          NOT NULL,
    last_modified_at   DATE          NOT NULL,
    CONSTRAINT pk_factor_index PRIMARY KEY (factor_index_id)
);
CREATE INDEX i_factor_index_1 ON factor_index (factor_id);
CREATE INDEX i_factor_index_2 ON factor_index (factor_name);
CREATE INDEX i_factor_index_3 ON factor_index (topic_id);
CREATE INDEX i_factor_index_4 ON factor_index (topic_name);
CREATE INDEX i_factor_index_5 ON factor_index (tenant_id);
CREATE INDEX i_factor_index_6 ON factor_index (created_at);
CREATE INDEX i_factor_index_7 ON factor_index (last_modified_at);
