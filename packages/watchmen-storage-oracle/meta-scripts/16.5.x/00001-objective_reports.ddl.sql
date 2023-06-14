CREATE TABLE objectives_reports
(
    objective_report_id VARCHAR2(50) NOT NULL,
    name                VARCHAR2(100),
    time_frame          CLOB,
    variables           CLOB,
    cells               CLOB,
    tenant_id           VARCHAR2(50) NOT NULL,
    created_at          DATE         NOT NULL,
    created_by          VARCHAR2(50) NOT NULL,
    last_modified_at    DATE         NOT NULL,
    last_modified_by    VARCHAR2(50) NOT NULL,
    version             NUMBER(20),
    CONSTRAINT pk_objectives PRIMARY KEY (objective_report_id)
);
CREATE INDEX i_objectives_1 ON objectives_reports (name);
CREATE INDEX i_objectives_2 ON objectives_reports (tenant_id);
CREATE INDEX i_objectives_3 ON objectives_reports (created_at);
CREATE INDEX i_objectives_4 ON objectives_reports (created_by);
CREATE INDEX i_objectives_5 ON objectives_reports (last_modified_at);
CREATE INDEX i_objectives_6 ON objectives_reports (last_modified_by);
