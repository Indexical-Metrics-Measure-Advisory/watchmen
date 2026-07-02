CREATE TABLE virtual_ontologies
(
    ontology_id      VARCHAR2(50)   NOT NULL,
    name             VARCHAR2(255)  NOT NULL,
    description      CLOB,
    owner            VARCHAR2(100),
    technical_owner  VARCHAR2(100),
    tags             CLOB,
    sensitivity      VARCHAR2(20)   NOT NULL,
    virtual_objects  CLOB,
    virtual_links    CLOB,
    tenant_id        VARCHAR2(50)   NOT NULL,
    created_at       DATE           NOT NULL,
    created_by       VARCHAR2(50),
    last_modified_at DATE,
    last_modified_by VARCHAR2(50),
    version          NUMBER(10)     NOT NULL,
    CONSTRAINT pk_virtual_ontologies PRIMARY KEY (ontology_id)
);
CREATE UNIQUE INDEX u_virtual_ontologies_1 ON virtual_ontologies (name, tenant_id);
CREATE INDEX i_virtual_ontologies_1 ON virtual_ontologies (tenant_id);
CREATE INDEX i_virtual_ontologies_2 ON virtual_ontologies (created_at);
CREATE INDEX i_virtual_ontologies_3 ON virtual_ontologies (last_modified_at);
