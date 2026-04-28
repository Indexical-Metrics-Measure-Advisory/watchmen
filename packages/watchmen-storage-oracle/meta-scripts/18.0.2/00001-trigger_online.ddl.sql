CREATE TABLE trigger_online (
	online_trigger_id   NUMBER(20)          NOT NULL,
	code                VARCHAR2(50),
	record              CLOB,
	status              NUMBER(1),
	trace_id            NUMBER(20),
	result              CLOB,
	tenant_id           VARCHAR2(50)        NOT NULL,
    created_at          DATE                NOT NULL,
    created_by          VARCHAR2(50)        NOT NULL,
    last_modified_at    DATE                NOT NULL,
    last_modified_by    VARCHAR2(50)        NOT NULL,
	CONSTRAINT pk_trigger_online PRIMARY KEY (online_trigger_id)
);
CREATE INDEX i_trigger_online_1 ON trigger_online (tenant_id);
CREATE INDEX i_trigger_online_2 ON trigger_online (created_at);
CREATE INDEX i_trigger_online_3 ON trigger_online (created_by);
CREATE INDEX i_trigger_online_4 ON trigger_online (last_modified_at);
CREATE INDEX i_trigger_online_5 ON trigger_online (last_modified_by);
