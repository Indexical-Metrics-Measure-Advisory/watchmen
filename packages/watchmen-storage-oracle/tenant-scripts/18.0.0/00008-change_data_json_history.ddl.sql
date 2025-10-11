CREATE TABLE change_data_json_history
(
    change_json_id      NUMBER(20)      NOT NULL,
    resource_id         VARCHAR2(100)   NOT NULL,
    model_name          VARCHAR2(50)    NOT NULL,
    object_id           VARCHAR2(50)    NOT NULL,
    table_name          VARCHAR2(50)    NOT NULL,
    data_id             CLOB            NOT NULL,
    sequence            NUMBER(20),
    content             CLOB,
    depend_on           CLOB,
    is_posted           NUMBER(1)       NOT NULL,
    status              NUMBER(1)       NOT NULL,
    result              CLOB,
    task_id             NUMBER(20),
    table_trigger_id    NUMBER(20)      NOT NULL,
    model_trigger_id    NUMBER(20)      NOT NULL,
    module_trigger_id   NUMBER(20)      NOT NULL,
    event_trigger_id    NUMBER(20)      NOT NULL,
    tenant_id           VARCHAR2(50)    NOT NULL,
    created_at          DATE            NOT NULL,
    created_by          VARCHAR2(50)    NOT NULL,
    last_modified_at    DATE            NOT NULL,
    last_modified_by    VARCHAR2(50)    NOT NULL,
    CONSTRAINT pk_change_data_json PRIMARY KEY (change_json_id)
);
CREATE UNIQUE INDEX u_change_data_json_history_1 ON change_data_json_history (resource_id);
CREATE INDEX i_change_data_json_history_1 ON change_data_json_history (tenant_id);
CREATE INDEX i_change_data_json_history_2 ON change_data_json_history (created_at);
CREATE INDEX i_change_data_json_history_3 ON change_data_json_history (created_by);
CREATE INDEX i_change_data_json_history_4 ON change_data_json_history (last_modified_at);
CREATE INDEX i_change_data_json_history_5 ON change_data_json_history (last_modified_by);
CREATE INDEX i_change_data_json_history_6 ON change_data_json_history (table_trigger_id);
CREATE INDEX i_change_data_json_history_7 ON change_data_json_history (model_trigger_id);
CREATE INDEX i_change_data_json_history_8 ON change_data_json_history (module_trigger_id);
CREATE INDEX i_change_data_json_history_9 ON change_data_json_history (event_trigger_id);
CREATE INDEX i_change_data_json_history_model_name_object_id_model_trigger_id ON change_data_json_history (model_name, object_id, model_trigger_id);
CREATE INDEX i_change_data_json_history_status_model_trigger_id ON change_data_json_history (status, model_trigger_id);