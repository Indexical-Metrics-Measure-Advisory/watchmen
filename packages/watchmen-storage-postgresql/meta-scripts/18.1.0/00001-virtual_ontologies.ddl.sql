CREATE TABLE virtual_ontologies
(
    ontology_id      VARCHAR(50)    NOT NULL,
    name             VARCHAR(255)   NOT NULL,
    description      TEXT,
    owner            VARCHAR(100),
    technical_owner  VARCHAR(100),
    tags             JSON,
    sensitivity      VARCHAR(20)    NOT NULL,
    virtual_objects  JSON,
    virtual_links    JSON,
    tenant_id        VARCHAR(50)    NOT NULL,
    created_at       TIMESTAMP      NOT NULL,
    created_by       VARCHAR(50),
    last_modified_at TIMESTAMP,
    last_modified_by VARCHAR(50),
    version          INTEGER        NOT NULL,
    CONSTRAINT pk_virtual_ontologies PRIMARY KEY (ontology_id)
);
CREATE UNIQUE INDEX u_virtual_ontologies_1 ON virtual_ontologies (name, tenant_id);
CREATE INDEX i_virtual_ontologies_1 ON virtual_ontologies (tenant_id);
CREATE INDEX i_virtual_ontologies_2 ON virtual_ontologies (created_at);
CREATE INDEX i_virtual_ontologies_3 ON virtual_ontologies (last_modified_at);
