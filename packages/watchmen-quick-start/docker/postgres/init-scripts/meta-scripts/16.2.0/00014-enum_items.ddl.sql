CREATE TABLE enum_items
(
    item_id      VARCHAR(50) NOT NULL,
    code         VARCHAR(50) NOT NULL,
    label        VARCHAR(255),
    parent_code  VARCHAR(50),
    replace_code VARCHAR(50),
    enum_id      VARCHAR(50),
    tenant_id    VARCHAR(50) NOT NULL,
    CONSTRAINT pk_enum_items PRIMARY KEY (item_id)
);
CREATE INDEX i_enum_items_1 ON enum_items (code);
CREATE INDEX i_enum_items_2 ON enum_items (enum_id);
CREATE INDEX i_enum_items_3 ON enum_items (tenant_id);
