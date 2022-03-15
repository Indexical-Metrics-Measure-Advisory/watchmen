RENAME TABLE enums TO enums_1;
RENAME TABLE enums_1 TO enums;
ALTER TABLE enums CHANGE enumid enum_id VARCHAR(50) NOT NULL;
ALTER TABLE enums MODIFY description VARCHAR(255) NULL;
ALTER TABLE enums CHANGE parentenumid parent_enum_id VARCHAR(50) NULL;
ALTER TABLE enums CHANGE tenantid tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE enums DROP createtime;
ALTER TABLE enums DROP lastmodified;
ALTER TABLE enums ADD created_at DATETIME NOT NULL;
ALTER TABLE enums ADD created_by VARCHAR(50) NOT NULL;
ALTER TABLE enums ADD last_modified_at DATETIME NOT NULL;
ALTER TABLE enums ADD last_modified_by VARCHAR(50) NOT NULL;
ALTER TABLE enums ADD version BIGINT NULL;
CREATE INDEX created_at ON enums (created_at);
CREATE INDEX created_by ON enums (created_by);
CREATE INDEX last_modified_at ON enums (last_modified_at);
CREATE INDEX last_modified_by ON enums (last_modified_by);
CREATE INDEX name ON enums (name);
CREATE INDEX tenant_id ON enums (tenant_id);

CREATE TABLE enum_items (
    item_id      VARCHAR(50) NOT NULL,
    code         VARCHAR(50) NOT NULL,
    label        VARCHAR(100),
    parent_code  VARCHAR(50),
    replace_code VARCHAR(50),
    enum_id      VARCHAR(50),
    tenant_id    VARCHAR(50) NOT NULL,
    PRIMARY KEY (item_id),
    INDEX (code),
    INDEX (enum_id),
    INDEX (tenant_id)
);
