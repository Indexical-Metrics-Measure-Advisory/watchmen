CREATE TABLE trigger_table
(
    table_trigger_id    NUMBER(20)      NOT NULL,
    table_name          VARCHAR2(50)    NOT NULL,
    data_count          NUMBER(20),
    model_name          VARCHAR2(50)    NOT NULL,
    is_extracted        NUMBER(1)       NOT NULL,
    result              CLOB,
    model_trigger_id    NUMBER(20)      NOT NULL,
    module_trigger_id   NUMBER(20)      NOT NULL,
    event_trigger_id    NUMBER(20)      NOT NULL,
    tenant_id           VARCHAR2(50)    NOT NULL,
    created_at          DATE            NOT NULL,
    created_by          VARCHAR2(50)    NOT NULL,
    last_modified_at    DATE            NOT NULL,
    last_modified_by    VARCHAR2(50)    NOT NULL,
    CONSTRAINT pk_trigger_table PRIMARY KEY (table_trigger_id)
);
CREATE INDEX i_trigger_table_1 ON trigger_table (tenant_id);
CREATE INDEX i_trigger_table_2 ON trigger_table (created_at);
CREATE INDEX i_trigger_table_3 ON trigger_table (created_by);
CREATE INDEX i_trigger_table_4 ON trigger_table (last_modified_at);
CREATE INDEX i_trigger_table_5 ON trigger_table (last_modified_by);
CREATE INDEX i_trigger_table_model_trigger_id ON trigger_table (model_trigger_id);