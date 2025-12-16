CREATE TABLE semantic_models
(
    id           VARCHAR2(50) NOT NULL,
    name         VARCHAR2(128) NOT NULL,
    description  CLOB,
    node_relation CLOB NOT NULL,
    entities     CLOB NOT NULL,
    measures     CLOB NOT NULL,
    dimensions   CLOB NOT NULL,
    defaults     CLOB,
    primary_entity VARCHAR2(128),
    created_at   DATE    NOT NULL,
    created_by   VARCHAR2(50) NOT NULL,
    last_modified_at   DATE    NOT NULL,
    last_modified_by   VARCHAR2(50) NOT NULL,
    topic_id         VARCHAR2(50) NOT NULL,
    source_type      VARCHAR2(50) NOT NULL,
    version      NUMBER(20) NOT NULL,
    tenant_id    VARCHAR2(50) NOT NULL,
    CONSTRAINT pk_semantic_models PRIMARY KEY (id)
);

CREATE INDEX ix_semantic_models_tenant_id ON semantic_models (tenant_id);
CREATE INDEX ix_semantic_models_name ON semantic_models (name);
CREATE INDEX ix_semantic_models_primary_entity ON semantic_models (primary_entity);