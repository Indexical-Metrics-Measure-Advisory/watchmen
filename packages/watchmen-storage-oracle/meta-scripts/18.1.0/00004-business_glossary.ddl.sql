CREATE TABLE business_glossary
(
    standard_id      VARCHAR2(50)   NOT NULL,
    abbreviation     VARCHAR2(64)   NOT NULL,
    name             VARCHAR2(255)  NOT NULL,
    description      VARCHAR2(1024),
    status           VARCHAR2(32),
    source_url       VARCHAR2(512),
    tags             CLOB,
    entries          CLOB,
    tenant_id        VARCHAR2(50)   NOT NULL,
    created_at       DATE           NOT NULL,
    created_by       VARCHAR2(50)   NOT NULL,
    last_modified_at DATE           NOT NULL,
    last_modified_by VARCHAR2(50)   NOT NULL,
    version          NUMBER(10),
    CONSTRAINT pk_business_glossary PRIMARY KEY (standard_id)
);
CREATE UNIQUE INDEX uk_business_glossary_abbr_name ON business_glossary (abbreviation, name, tenant_id);
CREATE INDEX idx_business_glossary_tenant_id ON business_glossary (tenant_id);
CREATE INDEX idx_business_glossary_created_at ON business_glossary (created_at);
CREATE INDEX idx_business_glossary_last_modified_at ON business_glossary (last_modified_at);
