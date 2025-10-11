CREATE TABLE change_data_record_history
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
CREATE INDEX i_change_data_record_history_1 ON change_data_record_history (tenant_id);
CREATE INDEX i_change_data_record_history_2 ON change_data_record_history (created_at);
CREATE INDEX i_change_data_record_history_3 ON change_data_record_history (created_by);
CREATE INDEX i_change_data_record_history_4 ON change_data_record_history (last_modified_at);
CREATE INDEX i_change_data_record_history_5 ON change_data_record_history (last_modified_by);
CREATE INDEX i_change_data_record_history_6 ON change_data_record_history (table_trigger_id);
CREATE INDEX i_change_data_record_history_7 ON change_data_record_history (model_trigger_id);
CREATE INDEX i_change_data_record_history_8 ON change_data_record_history (module_trigger_id);
CREATE INDEX i_change_data_record_history_9 ON change_data_record_history (event_trigger_id);
CREATE INDEX i_change_data_record_history_status_event_trigger_id ON change_data_record_history (status, event_trigger_id);