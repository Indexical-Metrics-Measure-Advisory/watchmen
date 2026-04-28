CREATE TABLE action_types
(
    action_type_id    VARCHAR(50)   NOT NULL,
    name              VARCHAR(128),
    code              VARCHAR(50),
    description       VARCHAR(1024),
    requires_approval TINYINT,
    enabled           TINYINT,
    category          VARCHAR(50),
    parameters        JSON,
    tenant_id         VARCHAR(50)   NOT NULL,
    created_at        DATETIME      NOT NULL,
    created_by        VARCHAR(50)   NOT NULL,
    last_modified_at  DATETIME      NOT NULL,
    last_modified_by  VARCHAR(50)   NOT NULL,
    version           INTEGER       NOT NULL,
    PRIMARY KEY (action_type_id)
);

CREATE INDEX i_action_types_tenant_id ON action_types (tenant_id);
CREATE INDEX i_action_types_code ON action_types (code);
