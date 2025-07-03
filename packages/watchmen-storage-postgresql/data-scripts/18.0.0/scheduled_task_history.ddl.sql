-- scheduled_task_history definition

-- Drop table

-- DROP TABLE scheduled_task_history;

CREATE TABLE scheduled_task_history (
	task_id int8 NOT NULL,
	resource_id varchar(50) NOT NULL,
	topic_code varchar(50) NOT NULL,
	"content" json NULL,
	model_name varchar(50) NOT NULL,
	object_id varchar(50) NOT NULL,
	depend_on json NULL,
	parent_task_id json NULL,
	is_finished int2 NOT NULL,
	"result" json NULL,
	tenant_id varchar(50) NOT NULL,
	created_at timestamp NOT NULL,
	created_by varchar(50) NOT NULL,
	last_modified_at timestamp NOT NULL,
	last_modified_by varchar(50) NOT NULL,
	status int2 NULL,
	event_id varchar(200) NULL,
	pipeline_id varchar(50) NULL,
	"type" int2 NULL,
	change_json_ids json NULL,
	event_trigger_id int8 NOT NULL,
	CONSTRAINT pk_scheduled_task_history PRIMARY KEY (task_id)
);
CREATE INDEX i_scheduled_task_history_1 ON scheduled_task_history USING btree (tenant_id);
CREATE INDEX i_scheduled_task_history_2 ON scheduled_task_history USING btree (created_at);
CREATE INDEX i_scheduled_task_history_3 ON scheduled_task_history USING btree (created_by);
CREATE INDEX i_scheduled_task_history_4 ON scheduled_task_history USING btree (last_modified_at);
CREATE INDEX i_scheduled_task_history_5 ON scheduled_task_history USING btree (last_modified_by);
CREATE INDEX i_scheduled_task_history_6 ON scheduled_task_history USING btree (object_id, model_name);
CREATE INDEX idx_task_history_event_trigger_id ON scheduled_task_history USING btree (event_trigger_id);
CREATE UNIQUE INDEX u_scheduled_task_history_1 ON scheduled_task_history USING btree (resource_id);