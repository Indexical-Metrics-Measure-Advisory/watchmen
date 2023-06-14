CREATE TABLE derived_objectives_report
(
    derived_objective_report_id NVARCHAR(50)  NOT NULL,
    name                 NVARCHAR(100) NOT NULL,
    description          NVARCHAR(1024),
    objective_report_id         NVARCHAR(50)  NOT NULL,
    definition           NVARCHAR(MAX),
    user_id              NVARCHAR(50)  NOT NULL,
    tenant_id            NVARCHAR(50)  NOT NULL,
    last_visit_time      DATETIME      NOT NULL,
    created_at           DATETIME      NOT NULL,
    created_by           NVARCHAR(50)  NOT NULL,
    last_modified_at     DATETIME      NOT NULL,
    last_modified_by     NVARCHAR(50)  NOT NULL,
    CONSTRAINT pk_derived_objectives PRIMARY KEY (derivderived_objective_report_ided_objective_id)
);
CREATE INDEX i_derived_objectives_1 ON derived_objectives_report (name);
CREATE INDEX i_derived_objectives_2 ON derived_objectives_report (objective_report_id);
CREATE INDEX i_derived_objectives_3 ON derived_objectives_report (user_id);
CREATE INDEX i_derived_objectives_4 ON derived_objectives_report (tenant_id);
CREATE INDEX i_derived_objectives_5 ON derived_objectives_report (created_at);
CREATE INDEX i_derived_objectives_6 ON derived_objectives_report (created_by);
CREATE INDEX i_derived_objectives_7 ON derived_objectives_report (last_modified_at);
CREATE INDEX i_derived_objectives_8 ON derived_objectives_report (last_modified_by);
