-- noinspection SqlResolveForFile
RENAME TABLE tenants TO tenants_1;
RENAME TABLE tenants_1 TO tenants;
ALTER TABLE tenants
    CHANGE tenantid tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE tenants
    MODIFY name VARCHAR(50) NULL;
ALTER TABLE tenants
    DROP createtime;
ALTER TABLE tenants
    DROP lastmodified;
ALTER TABLE tenants
    ADD created_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE tenants
    ADD created_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE tenants
    ADD last_modified_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE tenants
    ADD last_modified_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE tenants
    ADD version BIGINT NULL;
CREATE INDEX created_at ON tenants (created_at);
CREATE INDEX created_by ON tenants (created_by);
CREATE INDEX last_modified_at ON tenants (last_modified_at);
CREATE INDEX last_modified_by ON tenants (last_modified_by);
-- noinspection SqlWithoutWhere
UPDATE tenants
set created_at       = NOW(),
    created_by       = '-1',
    last_modified_at = NOW(),
    last_modified_by = '-1',
    version          = 1;
