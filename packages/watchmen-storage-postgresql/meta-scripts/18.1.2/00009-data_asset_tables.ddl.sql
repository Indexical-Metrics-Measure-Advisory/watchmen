-- Data asset tables: catalog tree, data products (ODPS v4.1), asset snapshots
CREATE TABLE data_asset_catalogs
(
    catalog_id       VARCHAR(60)  NOT NULL,
    name             VARCHAR(255) NOT NULL,
    description      VARCHAR(1024),
    parent_id        VARCHAR(60),
    order_index      INT,
    tenant_id        VARCHAR(50)  NOT NULL,
    created_at       TIMESTAMP    NOT NULL,
    created_by       VARCHAR(50)  NOT NULL,
    last_modified_at TIMESTAMP    NOT NULL,
    last_modified_by VARCHAR(50)  NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_data_asset_catalogs PRIMARY KEY (catalog_id)
);
CREATE INDEX i_data_asset_catalogs_1 ON data_asset_catalogs (name);
CREATE INDEX i_data_asset_catalogs_2 ON data_asset_catalogs (parent_id);
CREATE INDEX i_data_asset_catalogs_3 ON data_asset_catalogs (tenant_id);
CREATE INDEX i_data_asset_catalogs_4 ON data_asset_catalogs (created_at);
CREATE INDEX i_data_asset_catalogs_5 ON data_asset_catalogs (created_by);
CREATE INDEX i_data_asset_catalogs_6 ON data_asset_catalogs (last_modified_at);
CREATE INDEX i_data_asset_catalogs_7 ON data_asset_catalogs (last_modified_by);

CREATE TABLE data_products
(
    product_id       VARCHAR(60)   NOT NULL,
    name             VARCHAR(255)  NOT NULL,
    display_name     VARCHAR(255),
    status           VARCHAR(32),
    product_type     VARCHAR(32),
    visibility       VARCHAR(32),
    domain           VARCHAR(128),
    owner            VARCHAR(128),
    description      VARCHAR(2048),
    product_version  VARCHAR(32),
    catalog_id       VARCHAR(60),
    value_score      INT,
    tags             JSON,
    categories       JSON,
    topic_ids        JSON,
    product          JSON,
    tenant_id        VARCHAR(50)   NOT NULL,
    created_at       TIMESTAMP     NOT NULL,
    created_by       VARCHAR(50)   NOT NULL,
    last_modified_at TIMESTAMP     NOT NULL,
    last_modified_by VARCHAR(50)   NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_data_products PRIMARY KEY (product_id)
);
CREATE INDEX i_data_products_1 ON data_products (name);
CREATE INDEX i_data_products_2 ON data_products (catalog_id);
CREATE INDEX i_data_products_3 ON data_products (domain);
CREATE INDEX i_data_products_4 ON data_products (status);
CREATE INDEX i_data_products_5 ON data_products (tenant_id);
CREATE INDEX i_data_products_6 ON data_products (created_at);
CREATE INDEX i_data_products_7 ON data_products (created_by);
CREATE INDEX i_data_products_8 ON data_products (last_modified_at);
CREATE INDEX i_data_products_9 ON data_products (last_modified_by);

CREATE TABLE data_asset_snapshots
(
    snapshot_id      VARCHAR(60) NOT NULL,
    snapshot_date    VARCHAR(20) NOT NULL,
    total_topics     INT,
    total_rows       DECIMAL(20),
    total_factors    INT,
    product_count    INT,
    topic_sizes      JSON,
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       TIMESTAMP   NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP   NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_data_asset_snapshots PRIMARY KEY (snapshot_id)
);
CREATE INDEX i_data_asset_snapshots_1 ON data_asset_snapshots (snapshot_date);
CREATE INDEX i_data_asset_snapshots_2 ON data_asset_snapshots (tenant_id);
CREATE INDEX i_data_asset_snapshots_3 ON data_asset_snapshots (created_at);
CREATE INDEX i_data_asset_snapshots_4 ON data_asset_snapshots (created_by);
CREATE INDEX i_data_asset_snapshots_5 ON data_asset_snapshots (last_modified_at);
CREATE INDEX i_data_asset_snapshots_6 ON data_asset_snapshots (last_modified_by);
