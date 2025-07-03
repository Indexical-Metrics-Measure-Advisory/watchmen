-- trigger_event definition

-- Drop table

-- DROP TABLE trigger_event;

CREATE TABLE trigger_event (
	event_trigger_id int8 NOT NULL,
	start_time timestamp NULL,
	end_time timestamp NULL,
	is_finished int2 NOT NULL,
	tenant_id varchar(50) NOT NULL,
	created_at timestamp NOT NULL,
	created_by varchar(50) NOT NULL,
	last_modified_at timestamp NOT NULL,
	last_modified_by varchar(50) NOT NULL,
	status int2 NULL,
	"type" int2 NULL,
	table_name varchar(50) NULL,
	records json NULL,
	pipeline_id varchar(50) NULL,
	params json NULL,
	CONSTRAINT pk_trigger_event PRIMARY KEY (event_trigger_id)
);
CREATE INDEX i_trigger_event_1 ON trigger_event USING btree (tenant_id);
CREATE INDEX i_trigger_event_2 ON trigger_event USING btree (created_at);
CREATE INDEX i_trigger_event_3 ON trigger_event USING btree (created_by);
CREATE INDEX i_trigger_event_4 ON trigger_event USING btree (last_modified_at);
CREATE INDEX i_trigger_event_5 ON trigger_event USING btree (last_modified_by);