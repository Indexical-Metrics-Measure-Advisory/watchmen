-- Migration: Business Glossary v2 restructure
-- Replace old Standard/EntryMap model with Glossary/Category/Term model
-- Strategy: create new table, migrate data, drop old, rename

-- Step 1: Create new table
CREATE TABLE business_glossary_v2
(
    standard_id      NVARCHAR(50)   NOT NULL,
    name             NVARCHAR(255)  NOT NULL,
    display_name     NVARCHAR(255),
    description      NVARCHAR(2048),
    language         NVARCHAR(16),
    status           NVARCHAR(32),
    owner            NVARCHAR(128),
    tags             NVARCHAR(MAX),
    categories       NVARCHAR(MAX),
    terms            NVARCHAR(MAX),
    tenant_id        NVARCHAR(50)   NOT NULL,
    created_at       DATETIME2      NOT NULL,
    created_by       NVARCHAR(50)   NOT NULL,
    last_modified_at DATETIME2      NOT NULL,
    last_modified_by NVARCHAR(50)   NOT NULL,
    version          INT,
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
    N'[]' AS categories,
    N'[]' AS terms,
    tenant_id,
    created_at,
    created_by,
    last_modified_at,
    last_modified_by,
    version
FROM business_glossary;

-- Step 3: Drop old table and rename
-- MSSQL requires dropping constraints first if any FK exist
DROP TABLE business_glossary;
EXEC sp_rename 'business_glossary_v2', 'business_glossary';

-- Step 4: Recreate indexes
CREATE UNIQUE INDEX uk_business_glossary_name ON business_glossary (name, tenant_id);
CREATE INDEX idx_business_glossary_tenant_id ON business_glossary (tenant_id);
CREATE INDEX idx_business_glossary_created_at ON business_glossary (created_at);
CREATE INDEX idx_business_glossary_last_modified_at ON business_glossary (last_modified_at);
