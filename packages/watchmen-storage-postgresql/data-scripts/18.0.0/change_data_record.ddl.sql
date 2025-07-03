-- change_data_record definition

-- Drop table

-- DROP TABLE change_data_record;

CREATE TABLE change_data_record (
	change_record_id int8 NOT NULL,
	model_name varchar(50) NOT NULL,
	table_name varchar(50) NOT NULL,
	data_id json NOT NULL,
	root_table_name varchar(50) NULL,
	root_data_id json NULL,
	is_merged int2 NOT NULL,
	"result" json NULL,
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
	CONSTRAINT pk_change_data_record PRIMARY KEY (change_record_id)
);
CREATE INDEX i_change_data_record_1 ON change_data_record USING btree (tenant_id);
CREATE INDEX i_change_data_record_2 ON change_data_record USING btree (created_at);
CREATE INDEX i_change_data_record_3 ON change_data_record USING btree (created_by);
CREATE INDEX i_change_data_record_4 ON change_data_record USING btree (last_modified_at);
CREATE INDEX i_change_data_record_5 ON change_data_record USING btree (last_modified_by);
CREATE INDEX i_change_data_record_6 ON change_data_record USING btree (table_trigger_id);
CREATE INDEX i_change_data_record_7 ON change_data_record USING btree (model_trigger_id);
CREATE INDEX i_change_data_record_8 ON change_data_record USING btree (event_trigger_id);
CREATE INDEX idx_record_model_trigger_id ON change_data_record USING btree (model_trigger_id);
CREATE INDEX idx_record_module_trigger_id ON change_data_record USING btree (module_trigger_id);