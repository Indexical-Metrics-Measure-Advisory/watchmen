CREATE TABLE catalogs
(
    catalog_id       VARCHAR(50) NOT NULL,
    name             VARCHAR(50) NOT NULL,
    topic_ids        JSON,
    tech_owner_id    VARCHAR(50),
    biz_owner_id     VARCHAR(50),
    tags             JSON,
    description      VARCHAR(1024),
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       TIMESTAMP   NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP   NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_catalogs PRIMARY KEY (catalog_id)
);
CREATE INDEX i_catalogs_1 ON catalogs (name);
CREATE INDEX i_catalogs_2 ON catalogs (tech_owner_id);
CREATE INDEX i_catalogs_3 ON catalogs (biz_owner_id);
CREATE INDEX i_catalogs_4 ON catalogs (tenant_id);
CREATE INDEX i_catalogs_5 ON catalogs (created_at);
CREATE INDEX i_catalogs_6 ON catalogs (created_by);
CREATE INDEX i_catalogs_7 ON catalogs (last_modified_at);
CREATE INDEX i_catalogs_8 ON catalogs (last_modified_by);
