CREATE TABLE pii_classification_terms
(
    term_id              NVARCHAR(50)  NOT NULL,
    name                 NVARCHAR(255) NOT NULL,
    description          NVARCHAR(MAX),
    category             NVARCHAR(64),
    sensitivity_level    NVARCHAR(16),
    data_level           NVARCHAR(64),
    owner_department     NVARCHAR(128),
    match_strategy       NVARCHAR(16),
    factor_type_patterns NVARCHAR(MAX),
    keyword_patterns     NVARCHAR(MAX),
    linked_factors       NVARCHAR(MAX),
    tenant_id            NVARCHAR(50)  NOT NULL,
    created_at           DATETIME      NOT NULL,
    created_by           NVARCHAR(50)  NOT NULL,
    last_modified_at     DATETIME      NOT NULL,
    last_modified_by     NVARCHAR(50)  NOT NULL,
    version              INTEGER,
    CONSTRAINT pk_pii_classification_terms PRIMARY KEY (term_id)
);
CREATE UNIQUE INDEX uk_pii_classification_terms_name ON pii_classification_terms (name, tenant_id);
CREATE INDEX idx_pii_classification_terms_tenant_id ON pii_classification_terms (tenant_id);
CREATE INDEX idx_pii_classification_terms_created_at ON pii_classification_terms (created_at);
CREATE INDEX idx_pii_classification_terms_last_modified_at ON pii_classification_terms (last_modified_at);
