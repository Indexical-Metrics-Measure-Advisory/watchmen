CREATE TABLE derived_objective_reports
(
    derived_objective_report_id VARCHAR(50)  NOT NULL,
    name                 VARCHAR(100) NOT NULL,
    description          VARCHAR(1024),
    objective_report_id         VARCHAR(50)  NOT NULL,
    definition           JSON,
    user_id              VARCHAR(50)  NOT NULL,
    tenant_id            VARCHAR(50)  NOT NULL,
    last_visit_time      DATE         NOT NULL,
    created_at           DATE         NOT NULL,
    created_by           VARCHAR(50)  NOT NULL,
    last_modified_at     DATE         NOT NULL,
    last_modified_by     VARCHAR(50)  NOT NULL,
    CONSTRAINT pk_derived_objectives PRIMARY KEY (derived_objective_report_id)
);
CREATE INDEX i_derived_objectives_1 ON derived_objective_reports (name);
CREATE INDEX i_derived_objectives_2 ON derived_objective_reports (objective_report_id);
CREATE INDEX i_derived_objectives_3 ON derived_objective_reports (user_id);
CREATE INDEX i_derived_objectives_4 ON derived_objective_reports (tenant_id);
CREATE INDEX i_derived_objectives_5 ON derived_objective_reports (created_at);
CREATE INDEX i_derived_objectives_6 ON derived_objective_reports (created_by);
CREATE INDEX i_derived_objectives_7 ON derived_objective_reports (last_modified_at);
CREATE INDEX i_derived_objectives_8 ON derived_objective_reports (last_modified_by);
