CREATE TABLE derived_objectives
(
    derived_objective_id VARCHAR2(50)  NOT NULL,
    name                 VARCHAR2(100) NOT NULL,
    description          VARCHAR2(1024),
    objective_id         VARCHAR2(50)  NOT NULL,
    definition           CLOB,
    breakdown_targets    CLOB,
    user_id              VARCHAR2(50)  NOT NULL,
    tenant_id            VARCHAR2(50)  NOT NULL,
    last_visit_time      DATE          NOT NULL,
    created_at           DATE          NOT NULL,
    created_by           VARCHAR2(50)  NOT NULL,
    last_modified_at     DATE          NOT NULL,
    last_modified_by     VARCHAR2(50)  NOT NULL,
    CONSTRAINT pk_derived_objectives PRIMARY KEY (derived_objective_id)
);
CREATE INDEX i_derived_objectives_1 ON derived_objectives (name);
CREATE INDEX i_derived_objectives_2 ON derived_objectives (objective_id);
CREATE INDEX i_derived_objectives_3 ON derived_objectives (user_id);
CREATE INDEX i_derived_objectives_4 ON derived_objectives (tenant_id);
CREATE INDEX i_derived_objectives_5 ON derived_objectives (created_at);
CREATE INDEX i_derived_objectives_6 ON derived_objectives (created_by);
CREATE INDEX i_derived_objectives_7 ON derived_objectives (last_modified_at);
CREATE INDEX i_derived_objectives_8 ON derived_objectives (last_modified_by);
