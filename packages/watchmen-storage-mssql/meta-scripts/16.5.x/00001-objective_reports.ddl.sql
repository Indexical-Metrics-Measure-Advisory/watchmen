CREATE TABLE objectives_reports
(
    objective_report_id     NVARCHAR(50) NOT NULL,
    name             NVARCHAR(100),
    time_frame       NVARCHAR(MAX),
    variables        NVARCHAR(MAX),
    cells            NVARCHAR(MAX),
    tenant_id        NVARCHAR(50) NOT NULL,
    created_at       DATETIME     NOT NULL,
    created_by       NVARCHAR(50) NOT NULL,
    last_modified_at DATETIME     NOT NULL,
    last_modified_by NVARCHAR(50) NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_objectives PRIMARY KEY (objective_report_id)
);
CREATE INDEX i_objectives_1 ON objectives_reports (name);
CREATE INDEX i_objectives_2 ON objectives_reports (tenant_id);
CREATE INDEX i_objectives_3 ON objectives_reports (created_at);
CREATE INDEX i_objectives_4 ON objectives_reports (created_by);
CREATE INDEX i_objectives_5 ON objectives_reports (last_modified_at);
CREATE INDEX i_objectives_6 ON objectives_reports (last_modified_by);
