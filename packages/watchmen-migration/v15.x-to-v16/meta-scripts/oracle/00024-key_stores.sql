-- noinspection SqlResolveForFile
ALTER TABLE key_stores RENAME TO key_stores_1;
ALTER TABLE key_stores_1 RENAME TO key_stores;
ALTER TABLE key_stores
    DROP CONSTRAINT key_store_pk;
ALTER TABLE key_stores RENAME COLUMN tenantId TO tenant_id;
ALTER TABLE key_stores
    MODIFY tenant_id VARCHAR2(50);
ALTER TABLE key_stores RENAME COLUMN keyType TO key_type;
ALTER TABLE key_stores
    MODIFY key_type VARCHAR2(20);
ALTER TABLE key_stores RENAME COLUMN params TO params_1;
ALTER TABLE key_stores
    ADD params VARCHAR2(1024) NULL;
-- noinspection SqlWithoutWhere
UPDATE key_stores
SET params = params_1;
ALTER TABLE key_stores
    DROP COLUMN params_1;
ALTER TABLE key_stores
    DROP COLUMN createtime;
ALTER TABLE key_stores
    DROP COLUMN lastmodified;
ALTER TABLE key_stores
    ADD created_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE key_stores
    ADD created_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE key_stores
    ADD CONSTRAINT pk_key_stores PRIMARY KEY (tenant_id, key_type);
