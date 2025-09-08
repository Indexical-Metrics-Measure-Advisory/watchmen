CREATE TABLE change_data_json
(
    change_json_id      BIGINT            NOT NULL,
    resource_id         NVARCHAR(100)     NOT NULL,
    model_name          NVARCHAR(50)      NOT NULL,
    object_id           NVARCHAR(50)      NOT NULL,
    table_name          NVARCHAR(50)      NOT NULL,
    data_id             NVARCHAR(MAX)     NOT NULL,
    sequence            BIGINT,
    content             NVARCHAR(MAX),
    depend_on           NVARCHAR(MAX),
    is_posted           TINYINT           NOT NULL,
    status              TINYINT           NOT NULL,
    result              NVARCHAR(MAX),
    task_id             BIGINT,
    table_trigger_id    BIGINT            NOT NULL,
    model_trigger_id    BIGINT            NOT NULL,
    module_trigger_id   BIGINT            NOT NULL,
    event_trigger_id    BIGINT            NOT NULL,
    tenant_id           NVARCHAR(50)      NOT NULL,
    created_at          DATETIME          NOT NULL,
    created_by          NVARCHAR(50)      NOT NULL,
    last_modified_at    DATETIME          NOT NULL,
    last_modified_by    NVARCHAR(50)      NOT NULL,
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