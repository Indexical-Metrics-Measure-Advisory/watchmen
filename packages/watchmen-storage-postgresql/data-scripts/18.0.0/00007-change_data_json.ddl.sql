CREATE TABLE change_data_json
(
    change_json_id      BIGINT           NOT NULL,
    resource_id         VARCHAR(100)     NOT NULL,
    model_name          VARCHAR(50)      NOT NULL,
    object_id           VARCHAR(50)      NOT NULL,
    table_name          VARCHAR(50)      NOT NULL,
    data_id             JSON             NOT NULL,
    sequence            DECIMAL(20),
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
