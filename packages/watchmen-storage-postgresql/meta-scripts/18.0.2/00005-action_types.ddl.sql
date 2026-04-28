CREATE TABLE action_types
(
    action_type_id    VARCHAR(50)   NOT NULL,
    name              VARCHAR(128),
    code              VARCHAR(50),
    description       VARCHAR(1024),
    requires_approval SMALLINT,
    enabled           SMALLINT,
    category          VARCHAR(50),
    parameters        JSON,
    tenant_id         VARCHAR(50)   NOT NULL,
    created_at        TIMESTAMP     NOT NULL,
    created_by        VARCHAR(50)   NOT NULL,
    last_modified_at  TIMESTAMP     NOT NULL,
    last_modified_by  VARCHAR(50)   NOT NULL,
    version           INTEGER       NOT NULL,
    CONSTRAINT pk_action_types PRIMARY KEY (action_type_id)
);
CREATE INDEX i_action_types_1 ON action_types (tenant_id);
CREATE INDEX i_action_types_2 ON action_types (created_at);
CREATE INDEX i_action_types_3 ON action_types (created_by);
CREATE INDEX i_action_types_4 ON action_types (last_modified_at);
CREATE INDEX i_action_types_5 ON action_types (last_modified_by);
