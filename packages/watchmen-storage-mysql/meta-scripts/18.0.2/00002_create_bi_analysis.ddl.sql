CREATE TABLE bi_analysis (
    id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1024),
    cards JSON,
    tenant_id VARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL,
    created_by VARCHAR(50) NOT NULL,
    last_modified_at DATETIME NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    version INT DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE INDEX unique_bi_analysis_name (name, tenant_id),
    INDEX index_bi_analysis_tenant_id (tenant_id)
);
