-- trigger_module definition

-- Drop table

-- DROP TABLE trigger_module;

CREATE TABLE trigger_module (
	module_trigger_id int8 NOT NULL,
	module_name varchar(50) NOT NULL,
	is_finished int2 NOT NULL,
	priority int2 NOT NULL,
	event_trigger_id int8 NOT NULL,
	tenant_id varchar(50) NOT NULL,
	created_at timestamp NOT NULL,
	created_by varchar(50) NOT NULL,
	last_modified_at timestamp NOT NULL,
	last_modified_by varchar(50) NOT NULL,
	CONSTRAINT pk_trigger_module PRIMARY KEY (module_trigger_id)
);
CREATE INDEX i_trigger_module_1 ON trigger_module USING btree (tenant_id);
CREATE INDEX i_trigger_module_2 ON trigger_module USING btree (created_at);
CREATE INDEX i_trigger_module_3 ON trigger_module USING btree (created_by);
CREATE INDEX i_trigger_module_4 ON trigger_module USING btree (last_modified_at);
CREATE INDEX i_trigger_module_5 ON trigger_module USING btree (last_modified_by);
CREATE INDEX idx_trigger_module_event_trigger_id ON trigger_module USING btree (event_trigger_id);