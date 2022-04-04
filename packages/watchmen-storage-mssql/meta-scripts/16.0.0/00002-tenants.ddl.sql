CREATE TABLE tenants
(
    tenant_id        NVARCHAR(50) NOT NULL,
    name             NVARCHAR(50),
    created_at       DATETIME     NOT NULL,
    created_by       NVARCHAR(50) NOT NULL,
    last_modified_at DATETIME     NOT NULL,
    last_modified_by NVARCHAR(50) NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_tenants PRIMARY KEY (tenant_id)
);
CREATE INDEX i_tenants_1 ON tenants (created_at);
CREATE INDEX i_tenants_2 ON tenants (created_by);
CREATE INDEX i_tenants_3 ON tenants (last_modified_at);
CREATE INDEX i_tenants_4 ON tenants (last_modified_by);
