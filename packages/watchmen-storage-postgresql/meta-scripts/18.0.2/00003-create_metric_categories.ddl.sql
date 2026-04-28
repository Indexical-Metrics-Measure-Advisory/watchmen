CREATE TABLE metric_categories (
    id VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1024),
    color VARCHAR(50),
    icon VARCHAR(50),
    is_active SMALLINT DEFAULT 1,
    sort_order INT DEFAULT 0,
    tenant_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    created_by VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version INT DEFAULT 1,
    PRIMARY KEY (id)
);

CREATE UNIQUE INDEX u_metric_categories_1 ON metric_categories (name, tenant_id);
CREATE INDEX i_metric_categories_1 ON metric_categories (tenant_id);
