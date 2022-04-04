CREATE TABLE key_stores
(
    tenant_id  NVARCHAR(50)   NOT NULL,
    key_type   NVARCHAR(20)   NOT NULL,
    params     NVARCHAR(1024) NOT NULL,
    created_at DATETIME       NOT NULL,
    created_by NVARCHAR(50)   NOT NULL,
    CONSTRAINT pk_key_stores PRIMARY KEY (tenant_id, key_type)
);
