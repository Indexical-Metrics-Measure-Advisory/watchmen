CREATE TABLE scheduled_task
(
    task_id             DECIMAL(20)       NOT NULL,
    resource_id         NVARCHAR(50)      NOT NULL,
    topic_code          NVARCHAR(50)      NOT NULL,
    content             NVARCHAR(MAX),
    model_name          NVARCHAR(50)      NOT NULL,
    object_id           NVARCHAR(50)      NOT NULL,
    depend_on           NVARCHAR(MAX),
    parent_task_id      NVARCHAR(MAX),
	is_finished         TINYINT           NOT NULL,
	result              NVARCHAR(MAX),
    tenant_id           NVARCHAR(50)      NOT NULL,
    created_at          DATETIME          NOT NULL,
    created_by          NVARCHAR(50)      NOT NULL,
    last_modified_at    DATETIME          NOT NULL,
    last_modified_by    NVARCHAR(50)      NOT NULL,
    CONSTRAINT pk_scheduled_task PRIMARY KEY (task_id)
);
CREATE UNIQUE INDEX u_scheduled_task_1 ON scheduled_task (resource_id);
CREATE INDEX i_change_data_json_1 ON scheduled_task (tenant_id);
CREATE INDEX i_change_data_json_2 ON scheduled_task (created_at);
CREATE INDEX i_change_data_json_3 ON scheduled_task (created_by);
CREATE INDEX i_change_data_json_4 ON scheduled_task (last_modified_at);
CREATE INDEX i_change_data_json_5 ON scheduled_task (last_modified_by);
CREATE INDEX i_change_data_json_6 ON scheduled_task (object_id, model_name);
