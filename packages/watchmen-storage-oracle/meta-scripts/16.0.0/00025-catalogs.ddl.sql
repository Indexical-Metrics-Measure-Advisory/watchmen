CREATE TABLE catalogs
(
    catalog_id       VARCHAR2(50) NOT NULL,
    name             VARCHAR2(45) NOT NULL,
    topic_ids        VARCHAR(2048),
    tech_owner_id    VARCHAR2(50),
    biz_owner_id     VARCHAR2(50),
    tags             VARCHAR(2048),
    description      VARCHAR2(255),
    tenant_id        VARCHAR2(50) NOT NULL,
    created_at       DATE         NOT NULL,
    created_by       VARCHAR2(50) NOT NULL,
    last_modified_at DATE         NOT NULL,
    last_modified_by VARCHAR2(50) NOT NULL,
    version          NUMBER(20),
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
