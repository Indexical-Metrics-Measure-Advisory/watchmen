CREATE TABLE metric_categories (
    id NVARCHAR(50) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(1024),
    color NVARCHAR(50),
    icon NVARCHAR(50),
    is_active SMALLINT DEFAULT 1,
    sort_order INT DEFAULT 0,
    tenant_id NVARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL,
    created_by NVARCHAR(50) NOT NULL,
    last_modified_at DATETIME NOT NULL,
    last_modified_by NVARCHAR(50) NOT NULL,
    version INT DEFAULT 1,
    CONSTRAINT pk_metric_categories PRIMARY KEY (id)
);
CREATE UNIQUE INDEX u_metric_categories_1 ON metric_categories (name, tenant_id);
CREATE INDEX i_metric_categories_1 ON metric_categories (tenant_id);
