CREATE TABLE action_types
(
    action_type_id    VARCHAR2(50)   NOT NULL,
    name              VARCHAR2(128),
    code              VARCHAR2(50),
    description       VARCHAR2(1024),
    requires_approval NUMBER(1),
    enabled           NUMBER(1),
    category          VARCHAR2(50),
    parameters        CLOB,
    tenant_id         VARCHAR2(50)   NOT NULL,
    created_at        DATE           NOT NULL,
    created_by        VARCHAR2(50)   NOT NULL,
    last_modified_at  DATE           NOT NULL,
    last_modified_by  VARCHAR2(50)   NOT NULL,
    version           NUMBER(20)     NOT NULL,
    CONSTRAINT pk_action_types PRIMARY KEY (action_type_id)
);

CREATE INDEX i_action_types_tenant_id ON action_types (tenant_id);
CREATE INDEX i_action_types_code ON action_types (code);

CREATE TABLE suggested_actions
(
    suggested_action_id VARCHAR2(50)   NOT NULL,
    type_id             VARCHAR2(50)   NOT NULL,
    instance_id         VARCHAR2(50),
    parameters          CLOB,
    status              VARCHAR2(20),
    reason              VARCHAR2(1024),
    tenant_id           VARCHAR2(50)   NOT NULL,
    created_at          DATE           NOT NULL,
    created_by          VARCHAR2(50)   NOT NULL,
    last_modified_at    DATE           NOT NULL,
    last_modified_by    VARCHAR2(50)   NOT NULL,
    version             NUMBER(20)     NOT NULL,
    CONSTRAINT pk_suggested_actions PRIMARY KEY (suggested_action_id)
);

CREATE INDEX i_suggested_actions_tenant_id ON suggested_actions (tenant_id);
CREATE INDEX i_suggested_actions_type_id ON suggested_actions (type_id);
