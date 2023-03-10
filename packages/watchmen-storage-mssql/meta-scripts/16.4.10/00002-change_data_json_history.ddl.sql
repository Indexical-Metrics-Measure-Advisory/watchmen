CREATE TABLE change_data_json_history
(
    change_json_id      DECIMAL(20)       NOT NULL,
    resource_id         NVARCHAR(100)     NOT NULL,
    model_name          NVARCHAR(50)      NOT NULL,
    object_id           NVARCHAR(50)      NOT NULL,
    table_name          NVARCHAR(50)      NOT NULL,
    data_id             NVARCHAR(MAX)     NOT NULL,
    sequence            DECIMAL(20),
    content             NVARCHAR(MAX),
    depend_on           NVARCHAR(MAX),
    is_posted           TINYINT           NOT NULL,
    result              NVARCHAR(MAX),
    task_id             DECIMAL(20),
    table_trigger_id    DECIMAL(20)       NOT NULL,
    model_trigger_id    DECIMAL(20)       NOT NULL,
    event_trigger_id    DECIMAL(20)       NOT NULL,
    tenant_id           NVARCHAR(50)      NOT NULL,
    created_at          DATETIME          NOT NULL,
    created_by          NVARCHAR(50)      NOT NULL,
    last_modified_at    DATETIME          NOT NULL,
    last_modified_by    NVARCHAR(50)      NOT NULL,
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
CREATE INDEX i_change_data_json_history_8 ON change_data_json_history (event_trigger_id);