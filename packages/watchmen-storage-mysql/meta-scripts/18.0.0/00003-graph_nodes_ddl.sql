CREATE TABLE graph_nodes
(
    node_id             VARCHAR(50) NOT NULL,
    label               VARCHAR(50) NOT NULL,
    name                VARCHAR(200) NOT NULL,
    properties          JSON,
    document_id         VARCHAR(50) NOT NULL,
    tenant_id           VARCHAR(50) NOT NULL,
    created_at          DATETIME    NOT NULL,
    created_by          VARCHAR(50) NOT NULL,
    last_modified_at    DATETIME    NOT NULL,
    last_modified_by    VARCHAR(50) NOT NULL,
    version             INTEGER,
    PRIMARY KEY (tenant_id, node_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)

);
