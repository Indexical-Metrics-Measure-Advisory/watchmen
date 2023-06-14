CREATE TABLE objectives_reports
(
    objective_report_id     VARCHAR(50) NOT NULL,
    name             VARCHAR(100),

    time_frame       JSON,
    variables        JSON,
    cells          JSON,
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       TIMESTAMP   NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP   NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_objectives PRIMARY KEY (objective_report_id)
);
CREATE INDEX i_objectives_1 ON objectives_reports (name);
CREATE INDEX i_objectives_2 ON objectives_reports (tenant_id);
CREATE INDEX i_objectives_3 ON objectives_reports (created_at);
CREATE INDEX i_objectives_4 ON objectives_reports (created_by);
CREATE INDEX i_objectives_5 ON objectives_reports (last_modified_at);
CREATE INDEX i_objectives_6 ON objectives_reports (last_modified_by);
