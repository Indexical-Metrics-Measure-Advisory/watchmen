-- trigger_model definition

-- Drop table

-- DROP TABLE trigger_model;

CREATE TABLE trigger_model (
	model_trigger_id int8 NOT NULL,
	model_name varchar(50) NOT NULL,
	is_finished int2 NOT NULL,
	event_trigger_id int8 NOT NULL,
	tenant_id varchar(50) NOT NULL,
	created_at timestamp NOT NULL,
	created_by varchar(50) NOT NULL,
	last_modified_at timestamp NOT NULL,
	last_modified_by varchar(50) NOT NULL,
	priority int2 NOT NULL,
	module_trigger_id int8 NOT NULL,
	CONSTRAINT pk_trigger_model PRIMARY KEY (model_trigger_id)
);
CREATE INDEX i_trigger_model_1 ON trigger_model USING btree (tenant_id);
CREATE INDEX i_trigger_model_2 ON trigger_model USING btree (created_at);
CREATE INDEX i_trigger_model_3 ON trigger_model USING btree (created_by);
CREATE INDEX i_trigger_model_4 ON trigger_model USING btree (last_modified_at);
CREATE INDEX i_trigger_model_5 ON trigger_model USING btree (last_modified_by);
CREATE INDEX idx_trigger_model_module_trigger_id ON trigger_model USING btree (module_trigger_id);