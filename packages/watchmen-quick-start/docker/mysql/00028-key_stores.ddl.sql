CREATE TABLE key_stores
(
    tenant_id  VARCHAR(50) NOT NULL,
    key_type   VARCHAR(20) NOT NULL,
    params     JSON        NOT NULL,
    created_at DATETIME    NOT NULL,
    created_by VARCHAR(50) NOT NULL,
    PRIMARY KEY (tenant_id, key_type)
);
