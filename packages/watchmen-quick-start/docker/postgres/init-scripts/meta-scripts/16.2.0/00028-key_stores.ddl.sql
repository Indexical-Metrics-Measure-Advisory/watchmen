CREATE TABLE key_stores
(
    tenant_id  VARCHAR(50)   NOT NULL,
    key_type   VARCHAR(20)   NOT NULL,
    params     VARCHAR(1024) NOT NULL,
    created_at TIMESTAMP     NOT NULL,
    created_by VARCHAR(50)   NOT NULL,
    CONSTRAINT pk_key_stores PRIMARY KEY (tenant_id, key_type)
);
