CREATE TABLE metric_categories (
    id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1024),
    color VARCHAR(50),
    icon VARCHAR(50),
    is_active TINYINT(1) DEFAULT 1,
    sort_order INT DEFAULT 0,
    tenant_id VARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL,
    created_by VARCHAR(50) NOT NULL,
    last_modified_at DATETIME NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version INT DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE INDEX unique_metric_category_name (name, tenant_id),
    INDEX index_metric_category_tenant_id (tenant_id)
);
