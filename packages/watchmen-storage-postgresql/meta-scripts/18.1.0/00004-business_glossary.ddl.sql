CREATE TABLE business_glossary
(
    standard_id      VARCHAR(50)    NOT NULL,
    abbreviation     VARCHAR(64)    NOT NULL,
    name             VARCHAR(255)   NOT NULL,
    description      VARCHAR(1024),
    status           VARCHAR(32),
    source_url       VARCHAR(512),
    tags             JSON,
    entries          JSON,
    tenant_id        VARCHAR(50)    NOT NULL,
    created_at       TIMESTAMP      NOT NULL,
    created_by       VARCHAR(50)    NOT NULL,
    last_modified_at TIMESTAMP      NOT NULL,
    last_modified_by VARCHAR(50)    NOT NULL,
    version          INTEGER,
    CONSTRAINT pk_business_glossary PRIMARY KEY (standard_id)
);
CREATE UNIQUE INDEX uk_business_glossary_abbr_name ON business_glossary (abbreviation, name, tenant_id);
CREATE INDEX idx_business_glossary_tenant_id ON business_glossary (tenant_id);
CREATE INDEX idx_business_glossary_created_at ON business_glossary (created_at);
CREATE INDEX idx_business_glossary_last_modified_at ON business_glossary (last_modified_at);
