CREATE TABLE enum_items
(
    item_id          VARCHAR(50) NOT NULL,
    code             VARCHAR(50) NOT NULL,
    label            VARCHAR(100),
    parent_code      VARCHAR(50),
    replace_code     VARCHAR(50),
    enum_id          VARCHAR(50),
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       DATETIME    NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at DATETIME    NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          BIGINT,
    PRIMARY KEY (item_id),
    INDEX (code),
    INDEX (enum_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
