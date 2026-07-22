CREATE TABLE pii_classification_terms
(
    term_id              VARCHAR(50)  NOT NULL,
    name                 VARCHAR(255) NOT NULL,
    description          TEXT,
    category             VARCHAR(64),
    sensitivity_level    VARCHAR(16),
    data_level           VARCHAR(64),
    owner_department     VARCHAR(128),
    match_strategy       VARCHAR(16),
    factor_type_patterns TEXT,
    keyword_patterns     TEXT,
    linked_factors       TEXT,
    tenant_id            VARCHAR(50)  NOT NULL,
    created_at           TIMESTAMP    NOT NULL,
    created_by           VARCHAR(50)  NOT NULL,
    last_modified_at     TIMESTAMP    NOT NULL,
    last_modified_by     VARCHAR(50)  NOT NULL,
    version              INTEGER,
    CONSTRAINT pk_pii_classification_terms PRIMARY KEY (term_id)
);
CREATE UNIQUE INDEX uk_pii_classification_terms_name ON pii_classification_terms (name, tenant_id);
CREATE INDEX idx_pii_classification_terms_tenant_id ON pii_classification_terms (tenant_id);
CREATE INDEX idx_pii_classification_terms_created_at ON pii_classification_terms (created_at);
CREATE INDEX idx_pii_classification_terms_last_modified_at ON pii_classification_terms (last_modified_at);
