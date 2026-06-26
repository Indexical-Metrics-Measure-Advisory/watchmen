CREATE TABLE business_glossary
(
    standard_id     VARCHAR(50)  NOT NULL,
    abbreviation    VARCHAR(64)  NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     VARCHAR(1024),
    version         VARCHAR(64),
    status          VARCHAR(32),
    source_url      VARCHAR(512),
    tags            JSON,
    entries         JSON,
    tenant_id       VARCHAR(50)  NOT NULL,
    created_at      DATETIME     NOT NULL,
    created_by      VARCHAR(50)  NOT NULL,
    last_modified_at DATETIME    NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version         INTEGER      DEFAULT 1,
    PRIMARY KEY (standard_id),
    UNIQUE INDEX uk_business_glossary_abbr_name (abbreviation, name, tenant_id),
    KEY idx_business_glossary_tenant_id (tenant_id),
    KEY idx_business_glossary_created_at (created_at),
    KEY idx_business_glossary_last_modified_at (last_modified_at)
);
