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

CREATE TABLE suggested_actions
(
    suggested_action_id VARCHAR(50)   NOT NULL,
    name                VARCHAR(128),
    type_id             VARCHAR(50)   NOT NULL,
    risk_level          VARCHAR(20),
    description         VARCHAR(1024),
    expected_outcome    VARCHAR(1024),
    conditions          JSON,
    execution_mode      VARCHAR(20),
    priority            VARCHAR(20),
    enabled             TINYINT,
    execution_count     INTEGER,
    success_rate        DECIMAL(10, 2),
    last_executed       DATETIME,
    parameters          JSON,
    tenant_id           VARCHAR(50)   NOT NULL,
    created_at          DATETIME      NOT NULL,
    created_by          VARCHAR(50)   NOT NULL,
    last_modified_at    DATETIME      NOT NULL,
    last_modified_by    VARCHAR(50)   NOT NULL,
    version             INTEGER       NOT NULL,
    PRIMARY KEY (suggested_action_id)
);

CREATE INDEX i_suggested_actions_tenant_id ON suggested_actions (tenant_id);
CREATE INDEX i_suggested_actions_type_id ON suggested_actions (type_id);
