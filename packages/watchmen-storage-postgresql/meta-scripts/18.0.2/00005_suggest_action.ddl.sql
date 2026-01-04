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

CREATE TABLE suggested_actions
(
    suggested_action_id VARCHAR(50)   NOT NULL,
    name                VARCHAR(128),
    type_id             VARCHAR(50),
    risk_level          VARCHAR(20),
    description         VARCHAR(1024),
    expected_outcome    VARCHAR(1024),
    conditions          JSON,
    execution_mode      VARCHAR(20),
    priority            VARCHAR(20),
    enabled             SMALLINT,
    execution_count     INTEGER,
    success_rate        DECIMAL(10, 4),
    last_executed       TIMESTAMP,
    parameters          JSON,
    tenant_id           VARCHAR(50)   NOT NULL,
    created_at          TIMESTAMP     NOT NULL,
    created_by          VARCHAR(50)   NOT NULL,
    last_modified_at    TIMESTAMP     NOT NULL,
    last_modified_by    VARCHAR(50)   NOT NULL,
    version             INTEGER       NOT NULL,
    CONSTRAINT pk_suggested_actions PRIMARY KEY (suggested_action_id)
);
CREATE INDEX i_suggested_actions_1 ON suggested_actions (tenant_id);
CREATE INDEX i_suggested_actions_2 ON suggested_actions (created_at);
CREATE INDEX i_suggested_actions_3 ON suggested_actions (created_by);
CREATE INDEX i_suggested_actions_4 ON suggested_actions (last_modified_at);
CREATE INDEX i_suggested_actions_5 ON suggested_actions (last_modified_by);
CREATE INDEX i_suggested_actions_6 ON suggested_actions (type_id);
