-- Migration: Business Glossary v2 restructure
-- Replace old Standard/EntryMap model with Glossary/Category/Term model
-- Strategy: create new table, migrate data, drop old, rename

-- Step 1: Create new table
CREATE TABLE business_glossary_v2
(
    standard_id      VARCHAR2(50)   NOT NULL,
    name             VARCHAR2(255)  NOT NULL,
    display_name     VARCHAR2(255),
    description      VARCHAR2(2048),
    language         VARCHAR2(16),
    status           VARCHAR2(32),
    owner            VARCHAR2(128),
    tags             CLOB,
    categories       CLOB,
    terms            CLOB,
    tenant_id        VARCHAR2(50)   NOT NULL,
    created_at       TIMESTAMP      NOT NULL,
    created_by       VARCHAR2(50)   NOT NULL,
    last_modified_at TIMESTAMP      NOT NULL,
    last_modified_by VARCHAR2(50)   NOT NULL,
    version          NUMBER(10),
    CONSTRAINT pk_business_glossary_v2 PRIMARY KEY (standard_id)
);

-- Step 2: Migrate existing data
INSERT INTO business_glossary_v2 (standard_id, name, display_name, description, status, tags, categories, terms, tenant_id, created_at, created_by, last_modified_at, last_modified_by, version)
SELECT
    standard_id,
    name,
    name AS display_name,
    description,
    status,
    tags,
    '[]' AS categories,
    '[]' AS terms,
    tenant_id,
    created_at,
    created_by,
    last_modified_at,
    last_modified_by,
    version
FROM business_glossary;

-- Step 3: Drop old table and rename
DROP TABLE business_glossary;
ALTER TABLE business_glossary_v2 RENAME TO business_glossary;

-- Step 4: Recreate indexes
CREATE UNIQUE INDEX uk_business_glossary_name ON business_glossary (name, tenant_id);
CREATE INDEX idx_business_glossary_tenant_id ON business_glossary (tenant_id);
CREATE INDEX idx_business_glossary_created_at ON business_glossary (created_at);
CREATE INDEX idx_business_glossary_last_modified_at ON business_glossary (last_modified_at);
