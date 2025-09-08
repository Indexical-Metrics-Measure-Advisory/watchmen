CREATE TABLE scheduled_task_history
(
    task_id             BIGINT           NOT NULL,
    resource_id         VARCHAR(50)      NOT NULL,
    topic_code          VARCHAR(50)      NOT NULL,
    content             JSON,
    model_name          VARCHAR(50)      NOT NULL,
    object_id           VARCHAR(50)      NOT NULL,
    depend_on           JSON,
    parent_task_id      JSON,
	is_finished         SMALLINT         NOT NULL,
	result              JSON,
	status              SMALLINT         NOT NULL,
	event_id            VARCHAR(200),
	pipeline_id         VARCHAR(50),
	type                SMALLINT,
	change_json_ids     JSON,
	event_trigger_id    BIGINT           NOT NULL,
    tenant_id           VARCHAR(50)      NOT NULL,
    created_at          TIMESTAMP        NOT NULL,
    created_by          VARCHAR(50)      NOT NULL,
    last_modified_at    TIMESTAMP        NOT NULL,
    last_modified_by    VARCHAR(50)      NOT NULL,
    CONSTRAINT pk_scheduled_task_history PRIMARY KEY (task_id)
);
CREATE UNIQUE INDEX u_scheduled_task_history_1 ON scheduled_task_history (resource_id);
CREATE INDEX i_scheduled_task_history_1 ON scheduled_task_history (tenant_id);
CREATE INDEX i_scheduled_task_history_2 ON scheduled_task_history (created_at);
CREATE INDEX i_scheduled_task_history_3 ON scheduled_task_history (created_by);
CREATE INDEX i_scheduled_task_history_4 ON scheduled_task_history (last_modified_at);
CREATE INDEX i_scheduled_task_history_5 ON scheduled_task_history (last_modified_by);
CREATE INDEX i_scheduled_task_history_6 ON scheduled_task_history (object_id, model_name);
CREATE INDEX i_scheduled_task_history_event_trigger_id ON scheduled_task_history (event_trigger_id);
CREATE INDEX i_scheduled_task_history_model_name_event_trigger_id ON scheduled_task_history (model_name, event_trigger_id);
CREATE INDEX i_scheduled_task_history_model_name_object_id_event_trigger_id_tenant_id ON scheduled_task_history (model_name, object_id, event_trigger_id, tenant_id);

