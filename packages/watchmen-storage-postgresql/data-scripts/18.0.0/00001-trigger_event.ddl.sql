CREATE TABLE trigger_event (
	event_trigger_id    BIGINT              NOT NULL,
	start_time          TIMESTAMP,
	end_time            TIMESTAMP,
	is_finished         SMALLINT            NOT NULL,
	tenant_id           VARCHAR(50)         NOT NULL,
    created_at          TIMESTAMP           NOT NULL,
    created_by          VARCHAR(50)         NOT NULL,
    last_modified_at    TIMESTAMP           NOT NULL,
    last_modified_by    VARCHAR(50)         NOT NULL,
	status              SMALLINT,
	type                SMALLINT,
	table_name          VARCHAR(50),
	records             JSON,
	pipeline_id         VARCHAR(50),
	params              JSON,
	CONSTRAINT pk_trigger_event PRIMARY KEY (event_trigger_id)
);
CREATE INDEX i_trigger_event_1 ON trigger_event (tenant_id);
CREATE INDEX i_trigger_event_2 ON trigger_event (created_at);
CREATE INDEX i_trigger_event_3 ON trigger_event (created_by);
CREATE INDEX i_trigger_event_4 ON trigger_event (last_modified_at);
CREATE INDEX i_trigger_event_5 ON trigger_event (last_modified_by);
