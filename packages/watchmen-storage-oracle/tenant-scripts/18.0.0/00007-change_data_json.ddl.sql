CREATE TABLE change_data_json
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
CREATE UNIQUE INDEX u_change_data_json_1 ON change_data_json (resource_id);
CREATE INDEX i_change_data_json_1 ON change_data_json (tenant_id);
CREATE INDEX i_change_data_json_2 ON change_data_json (created_at);
CREATE INDEX i_change_data_json_3 ON change_data_json (created_by);
CREATE INDEX i_change_data_json_4 ON change_data_json (last_modified_at);
CREATE INDEX i_change_data_json_5 ON change_data_json (last_modified_by);
CREATE INDEX i_change_data_json_6 ON change_data_json (table_trigger_id);
CREATE INDEX i_change_data_json_7 ON change_data_json (model_trigger_id);
CREATE INDEX i_change_data_json_8 ON change_data_json (module_trigger_id);
CREATE INDEX i_change_data_json_9 ON change_data_json (event_trigger_id);
CREATE INDEX i_change_data_json_model_name_object_id_model_trigger_id ON change_data_json (model_name, object_id, model_trigger_id);
CREATE INDEX i_change_data_json_status_model_trigger_id ON change_data_json (status, model_trigger_id);