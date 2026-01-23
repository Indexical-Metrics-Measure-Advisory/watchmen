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
