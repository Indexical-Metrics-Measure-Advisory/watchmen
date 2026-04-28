CREATE TABLE trigger_online (
	online_trigger_id   BIGINT              NOT NULL,
	code                VARCHAR(50),
	record              JSON,
	status              TINYINT,
	trace_id            BIGINT,
	result              JSON,
	tenant_id           VARCHAR(50)         NOT NULL,
    created_at          DATETIME            NOT NULL,
    created_by          VARCHAR(50)         NOT NULL,
    last_modified_at    DATETIME            NOT NULL,
    last_modified_by    VARCHAR(50)         NOT NULL,
	PRIMARY KEY (online_trigger_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);