CREATE TABLE derived_objective_reports
(
    derived_objective_report_id VARCHAR(50)  NOT NULL,
    name                        VARCHAR(100) NOT NULL,
    description                 VARCHAR(1024),
    objective_report_id         VARCHAR(50)  NOT NULL,
    definition                  JSON,
    user_id                     VARCHAR(50)  NOT NULL,
    tenant_id                   VARCHAR(50)  NOT NULL,
    last_visit_time             DATE         NOT NULL,
    created_at                  DATE         NOT NULL,
    created_by                  VARCHAR(50)  NOT NULL,
    last_modified_at            DATE         NOT NULL,
    last_modified_by            VARCHAR(50)  NOT NULL,
    CONSTRAINT pk_derived_objective_reports PRIMARY KEY (derived_objective_report_id)
);
CREATE INDEX i_derived_objective_reports_1 ON derived_objective_reports (name);
CREATE INDEX i_derived_objective_reports_2 ON derived_objective_reports (objective_report_id);
CREATE INDEX i_derived_objective_reports_3 ON derived_objective_reports (user_id);
CREATE INDEX i_derived_objective_reports_4 ON derived_objective_reports (tenant_id);
CREATE INDEX i_derived_objective_reports_5 ON derived_objective_reports (created_at);
CREATE INDEX i_derived_objective_reports_6 ON derived_objective_reports (created_by);
CREATE INDEX i_derived_objective_reports_7 ON derived_objective_reports (last_modified_at);
CREATE INDEX i_derived_objective_reports_8 ON derived_objective_reports (last_modified_by);
