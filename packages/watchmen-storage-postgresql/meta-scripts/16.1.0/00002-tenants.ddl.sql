CREATE TABLE tenants
(
    tenant_id        VARCHAR(50) NOT NULL,
    name             VARCHAR(50),
    created_at       TIMESTAMP   NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP   NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_tenants PRIMARY KEY (tenant_id)
);
CREATE INDEX i_tenants_1 ON tenants (created_at);
CREATE INDEX i_tenants_2 ON tenants (created_by);
CREATE INDEX i_tenants_3 ON tenants (last_modified_at);
CREATE INDEX i_tenants_4 ON tenants (last_modified_by);
