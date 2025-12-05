CREATE TABLE bi_analysis (
    id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1024),
    cards JSONB,
    tenant_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    created_by VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    isTemplate BOOLEAN NOT NULL DEFAULT FALSE,
    version INT DEFAULT 1,
    PRIMARY KEY (id)
);

CREATE UNIQUE INDEX u_bi_analysis_1 ON bi_analysis (name, tenant_id);
CREATE INDEX i_bi_analysis_1 ON bi_analysis (tenant_id);
