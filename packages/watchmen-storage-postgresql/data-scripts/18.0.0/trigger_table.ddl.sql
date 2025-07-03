CREATE TABLE trigger_table (
	table_trigger_id int8 NOT NULL,
	table_name varchar(50) NOT NULL,
	data_count numeric(20) NULL,
	model_name varchar(50) NOT NULL,
	is_extracted int2 NOT NULL,
	"result" json NULL,
	model_trigger_id int8 NOT NULL,
	event_trigger_id int8 NOT NULL,
	tenant_id varchar(50) NOT NULL,
	created_at timestamp NOT NULL,
	created_by varchar(50) NOT NULL,
	last_modified_at timestamp NOT NULL,
	last_modified_by varchar(50) NOT NULL,
	module_trigger_id int8 NOT NULL,
	CONSTRAINT pk_trigger_table PRIMARY KEY (table_trigger_id)
);
CREATE INDEX i_trigger_table_1 ON trigger_table USING btree (tenant_id);
CREATE INDEX i_trigger_table_2 ON trigger_table USING btree (created_at);
CREATE INDEX i_trigger_table_3 ON trigger_table USING btree (created_by);
CREATE INDEX i_trigger_table_4 ON trigger_table USING btree (last_modified_at);
CREATE INDEX i_trigger_table_5 ON trigger_table USING btree (last_modified_by);
CREATE INDEX idx_trigger_table_model_trigger_id ON trigger_table USING btree (model_trigger_id);