CREATE TABLE factor_index
(
    factor_index_id    VARCHAR(50)  NOT NULL,
    factor_id          VARCHAR(50)  NOT NULL,
    factor_type        VARCHAR(50)  NOT NULL,
    factor_name        VARCHAR(255) NOT NULL,
    factor_label       VARCHAR(255),
    factor_description VARCHAR(1024),
    topic_id           VARCHAR(50)  NOT NULL,
    topic_name         VARCHAR(50)  NOT NULL,
    tenant_id          VARCHAR(50)  NOT NULL,
    created_at         TIMESTAMP    NOT NULL,
    last_modified_at   TIMESTAMP    NOT NULL,
    CONSTRAINT pk_factor_index PRIMARY KEY (factor_index_id)
);
CREATE INDEX i_factor_index_1 ON factor_index (factor_id);
CREATE INDEX i_factor_index_2 ON factor_index (factor_name);
CREATE INDEX i_factor_index_3 ON factor_index (topic_id);
CREATE INDEX i_factor_index_4 ON factor_index (topic_name);
CREATE INDEX i_factor_index_5 ON factor_index (tenant_id);
CREATE INDEX i_factor_index_6 ON factor_index (created_at);
CREATE INDEX i_factor_index_7 ON factor_index (last_modified_at);
