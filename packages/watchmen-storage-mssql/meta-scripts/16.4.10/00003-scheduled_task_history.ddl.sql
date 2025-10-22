CREATE TABLE scheduled_task_history
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
    CONSTRAINT pk_scheduled_task_history PRIMARY KEY (task_id)
);
CREATE UNIQUE INDEX u_scheduled_task_history_1 ON scheduled_task_history (resource_id);
CREATE INDEX i_scheduled_task_history_1 ON scheduled_task_history (tenant_id);
CREATE INDEX i_scheduled_task_history_2 ON scheduled_task_history (created_at);
CREATE INDEX i_scheduled_task_history_3 ON scheduled_task_history (created_by);
CREATE INDEX i_scheduled_task_history_4 ON scheduled_task_history (last_modified_at);
CREATE INDEX i_scheduled_task_history_5 ON scheduled_task_history (last_modified_by);
CREATE INDEX i_scheduled_task_history_6 ON scheduled_task_history (object_id, model_name);
