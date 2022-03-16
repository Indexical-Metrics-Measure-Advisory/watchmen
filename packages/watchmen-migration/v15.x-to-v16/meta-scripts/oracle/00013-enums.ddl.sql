ALTER TABLE enums RENAME TO enums_1;
ALTER TABLE enums_1 RENAME TO enums;
ALTER TABLE enums RENAME COLUMN enumid TO enum_id;
ALTER TABLE enums MODIFY (enum_id VARCHAR2(50) NOT NULL);
ALTER TABLE enums MODIFY description VARCHAR2(255) NULL;
ALTER TABLE enums RENAME COLUMN parentenumid TO parent_enum_id;
ALTER TABLE enums MODIFY (parent_enum_id VARCHAR2(50) NULL);
ALTER TABLE enums RENAME COLUMN tenantid TO tenant_id;
ALTER TABLE enums MODIFY (tenant_id VARCHAR2(50) NOT NULL);
ALTER TABLE enums DROP COLUMN createtime;
ALTER TABLE enums DROP COLUMN lastmodified;
ALTER TABLE enums ADD (created_at DATE DEFAULT SYSDATE NOT NULL);
ALTER TABLE enums ADD (created_by VARCHAR2(50) DEFAULT '-1' NOT NULL);
ALTER TABLE enums ADD (last_modified_at DATE DEFAULT SYSDATE NOT NULL);
ALTER TABLE enums ADD (last_modified_by VARCHAR2(50) DEFAULT '-1' NOT NULL);
ALTER TABLE enums ADD version NUMBER(20) NULL;
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
    label        VARCHAR2(100),
    parent_code  VARCHAR2(50),
    replace_code VARCHAR2(50),
    enum_id      VARCHAR2(50),
    tenant_id    VARCHAR2(50) NOT NULL,
    CONSTRAINT pk_enum_items PRIMARY KEY (item_id)
);
CREATE INDEX i_enum_items_1 ON enum_items (code);
CREATE INDEX i_enum_items_2 ON enum_items (enum_id);
CREATE INDEX i_enum_items_3 ON enum_items (tenant_id);
