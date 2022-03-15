CREATE TABLE key_stores
(
    tenant_id  VARCHAR2(50)   NOT NULL,
    key_type   VARCHAR2(20)   NOT NULL,
    params     VARCHAR2(1024) NOT NULL,
    created_at DATE           NOT NULL,
    created_by VARCHAR2(50)   NOT NULL,
    CONSTRAINT pk_key_stores PRIMARY KEY (tenant_id, key_type)
);
