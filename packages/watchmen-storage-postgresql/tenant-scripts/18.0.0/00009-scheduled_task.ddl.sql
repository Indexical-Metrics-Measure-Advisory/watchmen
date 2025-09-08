CREATE TABLE scheduled_task
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
    CONSTRAINT pk_scheduled_task PRIMARY KEY (task_id)
);
CREATE UNIQUE INDEX u_scheduled_task_1 ON scheduled_task (resource_id);
CREATE INDEX i_scheduled_task_1 ON scheduled_task (tenant_id);
CREATE INDEX i_scheduled_task_2 ON scheduled_task (created_at);
CREATE INDEX i_scheduled_task_3 ON scheduled_task (created_by);
CREATE INDEX i_scheduled_task_4 ON scheduled_task (last_modified_at);
CREATE INDEX i_scheduled_task_5 ON scheduled_task (last_modified_by);
CREATE INDEX i_scheduled_task_6 ON scheduled_task (object_id, model_name);
CREATE INDEX i_scheduled_task_event_trigger_id ON scheduled_task (event_trigger_id);
CREATE INDEX i_scheduled_task_model_name_event_trigger_id ON scheduled_task (model_name, event_trigger_id);
CREATE INDEX i_scheduled_task_model_name_object_id_event_trigger_id_tenant_id ON scheduled_task (model_name, object_id, event_trigger_id, tenant_id);

