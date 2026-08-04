CREATE TABLE batch_trigger_table
(
    table_trigger_id    BIGINT           NOT NULL,
    table_name          VARCHAR(50)      NOT NULL,
    data_count          DECIMAL(20),
    model_name          VARCHAR(50)      NOT NULL,
    is_extracted        SMALLINT         NOT NULL,
    result              JSON,
    model_trigger_id    BIGINT,
    module_trigger_id   BIGINT,
    event_trigger_id    BIGINT           NOT NULL,
    tenant_id           VARCHAR(50)      NOT NULL,
    created_at          TIMESTAMP        NOT NULL,
    created_by          VARCHAR(50)      NOT NULL,
    last_modified_at    TIMESTAMP        NOT NULL,
    last_modified_by    VARCHAR(50)      NOT NULL,
    CONSTRAINT pk_batch_trigger_table PRIMARY KEY (table_trigger_id)
);
CREATE INDEX i_batch_trigger_table_1 ON batch_trigger_table (tenant_id);
CREATE INDEX i_batch_trigger_table_2 ON batch_trigger_table (created_at);
CREATE INDEX i_batch_trigger_table_3 ON batch_trigger_table (created_by);
CREATE INDEX i_batch_trigger_table_4 ON batch_trigger_table (last_modified_at);
CREATE INDEX i_batch_trigger_table_5 ON batch_trigger_table (last_modified_by);
CREATE INDEX i_batch_trigger_table_model_trigger_id ON batch_trigger_table (model_trigger_id);