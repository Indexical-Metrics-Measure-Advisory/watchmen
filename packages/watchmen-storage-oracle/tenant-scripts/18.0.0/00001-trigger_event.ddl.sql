CREATE TABLE trigger_event
(
    event_trigger_id    NUMBER(20)          NOT NULL,
    start_time          DATE                NOT NULL,
    end_time            DATE                NOT NULL,
    is_finished         NUMBER(1)           NOT NULL,
    tenant_id           VARCHAR2(50)        NOT NULL,
    created_at          DATE                NOT NULL,
    created_by          VARCHAR2(50)        NOT NULL,
    last_modified_at    DATE                NOT NULL,
    last_modified_by    VARCHAR2(50)        NOT NULL,
    status              NUMBER(1),
	type                NUMBER(1),
	table_name          VARCHAR2(50),
	records             CLOB,
	pipeline_id         VARCHAR2(50),
	params              CLOB,
    CONSTRAINT pk_trigger_event PRIMARY KEY (event_trigger_id)
);
CREATE INDEX i_trigger_event_1 ON trigger_event (tenant_id);
CREATE INDEX i_trigger_event_2 ON trigger_event (created_at);
CREATE INDEX i_trigger_event_3 ON trigger_event (created_by);
CREATE INDEX i_trigger_event_4 ON trigger_event (last_modified_at);
CREATE INDEX i_trigger_event_5 ON trigger_event (last_modified_by);