CREATE TABLE business_glossary
(
    standard_id      NVARCHAR(50)   NOT NULL,
    abbreviation     NVARCHAR(64)   NOT NULL,
    name             NVARCHAR(255)  NOT NULL,
    description      NVARCHAR(1024),
    status           NVARCHAR(32),
    source_url       NVARCHAR(512),
    tags             NVARCHAR(MAX),
    entries          NVARCHAR(MAX),
    tenant_id        NVARCHAR(50)   NOT NULL,
    created_at       DATETIME       NOT NULL,
    created_by       NVARCHAR(50)   NOT NULL,
    last_modified_at DATETIME       NOT NULL,
    last_modified_by NVARCHAR(50)   NOT NULL,
    version          INTEGER,
    CONSTRAINT pk_business_glossary PRIMARY KEY (standard_id)
);
CREATE UNIQUE INDEX uk_business_glossary_abbr_name ON business_glossary (abbreviation, name, tenant_id);
CREATE INDEX idx_business_glossary_tenant_id ON business_glossary (tenant_id);
CREATE INDEX idx_business_glossary_created_at ON business_glossary (created_at);
CREATE INDEX idx_business_glossary_last_modified_at ON business_glossary (last_modified_at);
