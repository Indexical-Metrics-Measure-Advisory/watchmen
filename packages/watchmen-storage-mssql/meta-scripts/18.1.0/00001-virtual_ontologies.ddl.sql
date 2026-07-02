CREATE TABLE virtual_ontologies
(
    ontology_id      NVARCHAR(50)   NOT NULL,
    name             NVARCHAR(255)  NOT NULL,
    description      NVARCHAR(MAX),
    owner            NVARCHAR(100),
    technical_owner  NVARCHAR(100),
    tags             NVARCHAR(MAX),
    sensitivity      NVARCHAR(20)   NOT NULL,
    virtual_objects  NVARCHAR(MAX),
    virtual_links    NVARCHAR(MAX),
    tenant_id        NVARCHAR(50)   NOT NULL,
    created_at       DATETIME       NOT NULL,
    created_by       NVARCHAR(50),
    last_modified_at DATETIME,
    last_modified_by NVARCHAR(50),
    version          INTEGER        NOT NULL,
    CONSTRAINT pk_virtual_ontologies PRIMARY KEY (ontology_id)
);
CREATE UNIQUE INDEX u_virtual_ontologies_1 ON virtual_ontologies (name, tenant_id);
CREATE INDEX i_virtual_ontologies_1 ON virtual_ontologies (tenant_id);
CREATE INDEX i_virtual_ontologies_2 ON virtual_ontologies (created_at);
CREATE INDEX i_virtual_ontologies_3 ON virtual_ontologies (last_modified_at);
