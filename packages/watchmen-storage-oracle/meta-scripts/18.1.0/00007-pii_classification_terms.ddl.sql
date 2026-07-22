CREATE TABLE pii_classification_terms
(
    term_id              VARCHAR2(50)  NOT NULL,
    name                 VARCHAR2(255) NOT NULL,
    description          CLOB,
    category             VARCHAR2(64),
    sensitivity_level    VARCHAR2(16),
    data_level           VARCHAR2(64),
    owner_department     VARCHAR2(128),
    match_strategy       VARCHAR2(16),
    factor_type_patterns CLOB,
    keyword_patterns     CLOB,
    linked_factors       CLOB,
    tenant_id            VARCHAR2(50)  NOT NULL,
    created_at           DATE          NOT NULL,
    created_by           VARCHAR2(50)  NOT NULL,
    last_modified_at     DATE          NOT NULL,
    last_modified_by     VARCHAR2(50)  NOT NULL,
    version              NUMBER(10),
    CONSTRAINT pk_pii_classification_terms PRIMARY KEY (term_id)
);
CREATE UNIQUE INDEX uk_pii_terms_name ON pii_classification_terms (name, tenant_id);
CREATE INDEX idx_pii_terms_tenant_id ON pii_classification_terms (tenant_id);
CREATE INDEX idx_pii_terms_created_at ON pii_classification_terms (created_at);
CREATE INDEX idx_pii_terms_last_modified_at ON pii_classification_terms (last_modified_at);
