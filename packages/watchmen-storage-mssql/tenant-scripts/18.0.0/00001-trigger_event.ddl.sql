CREATE TABLE trigger_event
(
    event_trigger_id    BIGINT              NOT NULL,
    start_time          DATETIME            NOT NULL,
    end_time            DATETIME            NOT NULL,
    is_finished         TINYINT             NOT NULL,
    tenant_id           NVARCHAR(50)        NOT NULL,
    created_at          DATETIME            NOT NULL,
    created_by          NVARCHAR(50)        NOT NULL,
    last_modified_at    DATETIME            NOT NULL,
    last_modified_by    NVARCHAR(50)        NOT NULL,
    status              TINYINT,
	type                TINYINT,
	table_name          NVARCHAR(50),
	records             NVARCHAR(MAX),
	pipeline_id         NVARCHAR(50),
	params              NVARCHAR(MAX),
    CONSTRAINT pk_trigger_event PRIMARY KEY (event_trigger_id)
);
CREATE INDEX i_trigger_event_1 ON trigger_event (tenant_id);
CREATE INDEX i_trigger_event_2 ON trigger_event (created_at);
CREATE INDEX i_trigger_event_3 ON trigger_event (created_by);
CREATE INDEX i_trigger_event_4 ON trigger_event (last_modified_at);
CREATE INDEX i_trigger_event_5 ON trigger_event (last_modified_by);