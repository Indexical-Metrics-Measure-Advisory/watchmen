CREATE TABLE change_data_record
(
    change_record_id        NUMBER(20)      NOT NULL,
    model_name              VARCHAR2(50)    NOT NULL,
    table_name              VARCHAR2(50)    NOT NULL,
    data_id                 CLOB            NOT NULL,
    root_table_name         VARCHAR2(50),
    root_data_id            CLOB,
    is_merged               NUMBER(1)       NOT NULL,
    status                  NUMBER(1)       NOT NULL,
    result                  CLOB,
    table_trigger_id        NUMBER(20)      NOT NULL,
    model_trigger_id        NUMBER(20)      NOT NULL,
    module_trigger_id       NUMBER(20)      NOT NULL,
    event_trigger_id        NUMBER(20)      NOT NULL,
    tenant_id               VARCHAR2(50)    NOT NULL,
    created_at              DATE            NOT NULL,
    created_by              VARCHAR2(50)    NOT NULL,
    last_modified_at        DATE            NOT NULL,
    last_modified_by        VARCHAR2(50)    NOT NULL,
    CONSTRAINT pk_change_data_record PRIMARY KEY (change_record_id)
);
CREATE INDEX i_change_data_record_1 ON change_data_record (tenant_id);
CREATE INDEX i_change_data_record_2 ON change_data_record (created_at);
CREATE INDEX i_change_data_record_3 ON change_data_record (created_by);
CREATE INDEX i_change_data_record_4 ON change_data_record (last_modified_at);
CREATE INDEX i_change_data_record_5 ON change_data_record (last_modified_by);
CREATE INDEX i_change_data_record_6 ON change_data_record (table_trigger_id);
CREATE INDEX i_change_data_record_7 ON change_data_record (model_trigger_id);
CREATE INDEX i_change_data_record_8 ON change_data_record (module_trigger_id);
CREATE INDEX i_change_data_record_9 ON change_data_record (event_trigger_id);