CREATE TABLE graph_edges
(
    tenant_id          VARCHAR(50) NOT NULL,
    edge_id           VARCHAR(50) NOT NULL,
    label       VARCHAR(50),
    name       VARCHAR(200) NOT NULL,
    properties          JSON,
    source_node_id     VARCHAR(50) NOT NULL,
    document_id        VARCHAR(50) NOT NULL,
    target_node_id     VARCHAR(50) NOT NULL,
    created_at         DATETIME    NOT NULL,
    created_by         VARCHAR(50) NOT NULL,
    last_modified_at   DATETIME    NOT NULL,
    last_modified_by   VARCHAR(50) NOT NULL,
    version            BIGINT,
    PRIMARY KEY (tenant_id, edge_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
