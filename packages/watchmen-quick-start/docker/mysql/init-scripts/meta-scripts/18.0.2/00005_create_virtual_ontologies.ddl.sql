CREATE TABLE virtual_ontologies
(
    ontology_id      VARCHAR(50)  NOT NULL,
    name             VARCHAR(128) NOT NULL,
    description      VARCHAR(1024),
    owner            VARCHAR(128),
    technical_owner  VARCHAR(128),
    tags             JSON,
    sensitivity      VARCHAR(32),
    data_source_id   VARCHAR(50),
    virtual_objects  JSON,
    virtual_links    JSON,
    tenant_id        VARCHAR(50)  NOT NULL,
    created_at       DATETIME     NOT NULL,
    created_by       VARCHAR(50)  NOT NULL,
    last_modified_at DATETIME     NOT NULL,
    last_modified_by VARCHAR(50)  NOT NULL,
    version          INTEGER      DEFAULT 1,
    PRIMARY KEY (ontology_id),
    UNIQUE INDEX uk_virtual_ontologies_name (name, tenant_id),
    KEY idx_virtual_ontologies_tenant_id (tenant_id),
    KEY idx_virtual_ontologies_created_at (created_at),
    KEY idx_virtual_ontologies_last_modified_at (last_modified_at)
);
