CREATE TABLE metric_categories (
    id VARCHAR2(50) NOT NULL,
    name VARCHAR2(255) NOT NULL,
    description VARCHAR2(1024),
    color VARCHAR2(50),
    icon VARCHAR2(50),
    is_active NUMBER(1) DEFAULT 1,
    sort_order NUMBER(20) DEFAULT 0,
    tenant_id VARCHAR2(50) NOT NULL,
    created_at DATE NOT NULL,
    created_by VARCHAR2(50) NOT NULL,
    last_modified_at DATE NOT NULL,
    last_modified_by VARCHAR2(50) NOT NULL,
    version NUMBER(20) DEFAULT 1,
    CONSTRAINT pk_metric_categories PRIMARY KEY (id)
);

CREATE UNIQUE INDEX u_metric_categories_1 ON metric_categories (name, tenant_id);
CREATE INDEX i_metric_categories_1 ON metric_categories (tenant_id);
