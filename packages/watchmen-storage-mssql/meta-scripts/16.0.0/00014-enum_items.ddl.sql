CREATE TABLE enum_items
(
    item_id      NVARCHAR(50) NOT NULL,
    code         NVARCHAR(50) NOT NULL,
    label        NVARCHAR(255),
    parent_code  NVARCHAR(50),
    replace_code NVARCHAR(50),
    enum_id      NVARCHAR(50),
    tenant_id    NVARCHAR(50) NOT NULL,
    CONSTRAINT pk_enum_items PRIMARY KEY (item_id)
);
CREATE INDEX i_enum_items_1 ON enum_items (code);
CREATE INDEX i_enum_items_2 ON enum_items (enum_id);
CREATE INDEX i_enum_items_3 ON enum_items (tenant_id);
