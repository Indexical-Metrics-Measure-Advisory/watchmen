-- noinspection SqlResolveForFile
ALTER TABLE enums RENAME TO enums_1;
ALTER TABLE enums_1 RENAME TO enums;
ALTER TABLE enums RENAME COLUMN enumid TO enum_id;
ALTER TABLE enums
    MODIFY enum_id VARCHAR2(50);
ALTER TABLE enums
    MODIFY description VARCHAR2(1024);
ALTER TABLE enums RENAME COLUMN parentenumid TO parent_enum_id;
ALTER TABLE enums
    MODIFY parent_enum_id VARCHAR2(50);
ALTER TABLE enums RENAME COLUMN tenantid TO tenant_id;
ALTER TABLE enums
    MODIFY tenant_id VARCHAR2(50);
ALTER TABLE enums
    DROP COLUMN createtime;
ALTER TABLE enums
    DROP COLUMN lastmodified;
ALTER TABLE enums
    ADD created_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE enums
    ADD created_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE enums
    ADD last_modified_at DATE DEFAULT SYSDATE NOT NULL;
ALTER TABLE enums
    ADD last_modified_by VARCHAR2(50) DEFAULT '-1' NOT NULL;
ALTER TABLE enums
    ADD version NUMBER(20) NULL;
CREATE INDEX created_at ON enums (created_at);
CREATE INDEX created_by ON enums (created_by);
CREATE INDEX last_modified_at ON enums (last_modified_at);
CREATE INDEX last_modified_by ON enums (last_modified_by);
CREATE INDEX name ON enums (name);
CREATE INDEX tenant_id ON enums (tenant_id);
CREATE TABLE enum_items
(
    item_id      VARCHAR2(50) NOT NULL,
    code         VARCHAR2(50) NOT NULL,
    label        VARCHAR2(255),
    parent_code  VARCHAR2(50),
    replace_code VARCHAR2(50),
    enum_id      VARCHAR2(50),
    tenant_id    VARCHAR2(50) NOT NULL,
    CONSTRAINT pk_enum_items PRIMARY KEY (item_id)
);
CREATE INDEX i_enum_items_1 ON enum_items (code);
CREATE INDEX i_enum_items_2 ON enum_items (enum_id);
CREATE INDEX i_enum_items_3 ON enum_items (tenant_id);
CREATE OR REPLACE PROCEDURE WATCHMEN_MIGRATION_COPY_ENUM_ITEMS IS
    CURSOR cur_list IS SELECT enum_id, tenant_id, items
                       FROM enums
                       WHERE items IS NOT NULL;
    enum_items        JSON_ARRAY_T;
    current_item      JSON_OBJECT_T;
    next_item_id      INT DEFAULT 0;
    item_code         VARCHAR2(255) DEFAULT NULL;
    item_label        VARCHAR2(255) DEFAULT NULL;
    item_parent_code  VARCHAR2(255) DEFAULT NULL;
    item_replace_code VARCHAR2(255) DEFAULT NULL;
BEGIN
    FOR an_enum in cur_list
        LOOP
            enum_items := JSON_ARRAY_T(an_enum.items);
            FOR item_index IN 0 .. enum_items.GET_SIZE() - 1
                LOOP
                    current_item := TREAT(enum_items.GET(item_index) AS JSON_OBJECT_T);

                    SELECT NVL(MAX(TO_NUMBER(item_id)), 0) + 1 INTO next_item_id FROM enum_items;
                    item_code := REPLACE(TRIM(BOTH '"' FROM NVL(current_item.GET_STRING('code'), '')), '''', '''''');
                    item_label := REPLACE(TRIM(BOTH '"' FROM NVL(current_item.GET_STRING('label'), '')), '''', '''''');
                    item_parent_code :=
                            REPLACE(TRIM(BOTH '"' FROM NVL(current_item.GET_STRING('parentCode'), '')), '''', '''''');
                    item_replace_code :=
                            REPLACE(TRIM(BOTH '"' FROM NVL(current_item.GET_STRING('replaceCode'), '')), '''', '''''');

                    EXECUTE IMMEDIATE
                            'INSERT INTO enum_items(item_id, code, label, parent_code, replace_code, enum_id, tenant_id) VALUES (''' ||
                            next_item_id || ''', ''' || item_code || ''', ''' || item_label || ''', ''' ||
                            item_parent_code || ''', ''' ||
                            item_replace_code || ''', ''' || an_enum.enum_id || ''', ''' || an_enum.tenant_id || ''')';
                    COMMIT;
                END LOOP;
        END LOOP;
END;
CALL WATCHMEN_MIGRATION_COPY_ENUM_ITEMS();
DROP PROCEDURE WATCHMEN_MIGRATION_COPY_ENUM_ITEMS;
-- noinspection SqlWithoutWhere
UPDATE enums
SET created_at       = SYSDATE,
    created_by       = '-1',
    last_modified_at = SYSDATE,
    last_modified_by = '-1',
    version          = 1;
ALTER TABLE enums
    DROP COLUMN items;
