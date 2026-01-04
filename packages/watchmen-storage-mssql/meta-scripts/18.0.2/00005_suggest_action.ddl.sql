CREATE TABLE action_types
(
    action_type_id    NVARCHAR(50)   NOT NULL,
    name              NVARCHAR(128),
    code              NVARCHAR(50),
    description       NVARCHAR(1024),
    requires_approval TINYINT,
    enabled           TINYINT,
    category          NVARCHAR(50),
    parameters        NVARCHAR(MAX),
    tenant_id         NVARCHAR(50)   NOT NULL,
    created_at        DATETIME       NOT NULL,
    created_by        NVARCHAR(50)   NOT NULL,
    last_modified_at  DATETIME       NOT NULL,
    last_modified_by  NVARCHAR(50)   NOT NULL,
    version           DECIMAL(20)    NOT NULL,
    CONSTRAINT pk_action_types PRIMARY KEY (action_type_id)
);

CREATE INDEX i_action_types_tenant_id ON action_types (tenant_id);
CREATE INDEX i_action_types_code ON action_types (code);

CREATE TABLE suggested_actions
(
    suggested_action_id NVARCHAR(50)   NOT NULL,
    type_id             NVARCHAR(50)   NOT NULL,
    instance_id         NVARCHAR(50),
    parameters          NVARCHAR(MAX),
    status              NVARCHAR(20),
    reason              NVARCHAR(1024),
    tenant_id           NVARCHAR(50)   NOT NULL,
    created_at          DATETIME       NOT NULL,
    created_by          NVARCHAR(50)   NOT NULL,
    last_modified_at    DATETIME       NOT NULL,
    last_modified_by    NVARCHAR(50)   NOT NULL,
    version             DECIMAL(20)    NOT NULL,
    CONSTRAINT pk_suggested_actions PRIMARY KEY (suggested_action_id)
);

CREATE INDEX i_suggested_actions_tenant_id ON suggested_actions (tenant_id);
CREATE INDEX i_suggested_actions_type_id ON suggested_actions (type_id);
