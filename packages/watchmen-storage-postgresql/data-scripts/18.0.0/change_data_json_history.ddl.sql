-- change_data_json_history definition

-- Drop table

-- DROP TABLE change_data_json_history;

CREATE TABLE change_data_json_history (
	change_json_id int8 NOT NULL,
	resource_id varchar(500) NOT NULL,
	model_name varchar(50) NOT NULL,
	object_id varchar(50) NOT NULL,
	table_name varchar(50) NOT NULL,
	data_id json NOT NULL,
	"sequence" int8 NULL,
	"content" json NULL,
	depend_on json NULL,
	is_posted int2 NOT NULL,
	"result" json NULL,
	task_id int8 NULL,
	table_trigger_id int8 NOT NULL,
	model_trigger_id int8 NOT NULL,
	event_trigger_id int8 NOT NULL,
	tenant_id varchar(50) NOT NULL,
	created_at timestamp NOT NULL,
	created_by varchar(50) NOT NULL,
	last_modified_at timestamp NOT NULL,
	last_modified_by varchar(50) NOT NULL,
	module_trigger_id int8 NOT NULL,
	status int2 NULL,
	CONSTRAINT pk_change_data_json_history PRIMARY KEY (change_json_id)
);
CREATE INDEX i_change_data_json_history_1 ON change_data_json_history USING btree (tenant_id);
CREATE INDEX i_change_data_json_history_2 ON change_data_json_history USING btree (created_at);
CREATE INDEX i_change_data_json_history_3 ON change_data_json_history USING btree (created_by);
CREATE INDEX i_change_data_json_history_4 ON change_data_json_history USING btree (last_modified_at);
CREATE INDEX i_change_data_json_history_5 ON change_data_json_history USING btree (last_modified_by);
CREATE INDEX i_change_data_json_history_6 ON change_data_json_history USING btree (table_trigger_id);
CREATE INDEX i_change_data_json_history_7 ON change_data_json_history USING btree (model_trigger_id);
CREATE INDEX i_change_data_json_history_8 ON change_data_json_history USING btree (event_trigger_id);
CREATE UNIQUE INDEX u_change_data_json_history_1 ON change_data_json_history USING btree (resource_id);