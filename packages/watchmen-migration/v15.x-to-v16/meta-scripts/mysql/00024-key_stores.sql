-- noinspection SqlResolveForFile
RENAME TABLE key_stores TO key_stores_1;
RENAME TABLE key_stores_1 TO key_stores;
ALTER TABLE key_stores
    DROP PRIMARY KEY;
ALTER TABLE key_stores
    CHANGE tenantId tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE key_stores
    CHANGE keyType key_type VARCHAR(20) NOT NULL;
ALTER TABLE key_stores
    MODIFY params JSON NOT NULL;
ALTER TABLE key_stores
    DROP createtime;
ALTER TABLE key_stores
    DROP lastmodified;
ALTER TABLE key_stores
    ADD created_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE key_stores
    ADD created_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE key_stores
    ADD PRIMARY KEY (tenant_id, key_type);
