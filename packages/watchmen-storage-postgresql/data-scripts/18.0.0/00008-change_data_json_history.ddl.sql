CREATE TABLE change_data_json_history
(
    change_json_id      BIGINT           NOT NULL,
    resource_id         VARCHAR(100)     NOT NULL,
    model_name          VARCHAR(50)      NOT NULL,
    object_id           VARCHAR(50)      NOT NULL,
    table_name          VARCHAR(50)      NOT NULL,
    data_id             JSON             NOT NULL,
    sequence            INTEGER,
    content             JSON,
    depend_on           JSON,
    is_posted           SMALLINT         NOT NULL,
    status              SMALLINT         NOT NULL,
    result              JSON,
    task_id             BIGINT,
    table_trigger_id    BIGINT           NOT NULL,
    model_trigger_id    BIGINT           NOT NULL,
    module_trigger_id   BIGINT           NOT NULL,
    event_trigger_id    BIGINT           NOT NULL,
    tenant_id           VARCHAR(50)      NOT NULL,
    created_at          TIMESTAMP        NOT NULL,
    created_by          VARCHAR(50)      NOT NULL,
    last_modified_at    TIMESTAMP        NOT NULL,
    last_modified_by    VARCHAR(50)      NOT NULL,
    CONSTRAINT pk_change_data_json_history PRIMARY KEY (change_json_id)
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
