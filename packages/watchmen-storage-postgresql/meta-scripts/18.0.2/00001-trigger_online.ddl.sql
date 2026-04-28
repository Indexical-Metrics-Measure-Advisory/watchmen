CREATE TABLE trigger_online (
	online_trigger_id   BIGINT              NOT NULL,
	code                VARCHAR(50),
	record              JSON,
	status              SMALLINT,
	trace_id            BIGINT,
	result              JSON,
	tenant_id           VARCHAR(50)         NOT NULL,
    created_at          TIMESTAMP           NOT NULL,
    created_by          VARCHAR(50)         NOT NULL,
    last_modified_at    TIMESTAMP           NOT NULL,
    last_modified_by    VARCHAR(50)         NOT NULL,
	CONSTRAINT pk_trigger_online PRIMARY KEY (online_trigger_id)
);
CREATE INDEX i_trigger_online_1 ON trigger_online (tenant_id);
CREATE INDEX i_trigger_online_2 ON trigger_online (created_at);
CREATE INDEX i_trigger_online_3 ON trigger_online (created_by);
CREATE INDEX i_trigger_online_4 ON trigger_online (last_modified_at);
CREATE INDEX i_trigger_online_5 ON trigger_online (last_modified_by);