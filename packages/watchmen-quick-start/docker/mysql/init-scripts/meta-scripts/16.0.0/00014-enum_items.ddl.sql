CREATE TABLE enum_items
(
    item_id      VARCHAR(50) NOT NULL,
    code         VARCHAR(50) NOT NULL,
    label        VARCHAR(255),
    parent_code  VARCHAR(50),
    replace_code VARCHAR(50),
    enum_id      VARCHAR(50),
    tenant_id    VARCHAR(50) NOT NULL,
    PRIMARY KEY (item_id),
    INDEX (code),
    INDEX (enum_id),
    INDEX (tenant_id)
);
