ALTER TABLE tenants RENAME TO tenants_1;
ALTER TABLE tenants_1 RENAME TO tenants;
ALTER TABLE tenants RENAME COLUMN tenantid TO tenant_id;
ALTER TABLE tenants
    MODIFY tenant_id VARCHAR2(50);
ALTER TABLE tenants
    MODIFY name VARCHAR2(50) NULL;
ALTER TABLE tenants
    DROP COLUMN createtime;
ALTER TABLE tenants
    DROP COLUMN lastmodified;
ALTER TABLE tenants
    ADD created_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE tenants
    ADD created_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE tenants
    ADD last_modified_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE tenants
    ADD last_modified_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE tenants
    ADD version NUMBER(20) NULL;
CREATE INDEX i_tenants_created_at ON tenants (created_at);
CREATE INDEX i_tenants_created_by ON tenants (created_by);
CREATE INDEX i_tenants_last_modified_at ON tenants (last_modified_at);
CREATE INDEX i_tenants_last_modified_by ON tenants (last_modified_by);
-- noinspection SqlWithoutWhere
UPDATE tenants
set created_at       = SYSDATE,
    created_by       = '-1',
    last_modified_at = SYSDATE,
    last_modified_by = '-1',
    version          = 1;
