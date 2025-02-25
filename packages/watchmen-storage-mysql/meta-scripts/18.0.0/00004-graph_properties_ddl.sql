CREATE TABLE graph_properties
(
    property_id         VARCHAR(50) NOT NULL,
    node_id             VARCHAR(50) ,
    edge_id             VARCHAR(50),
    name                VARCHAR(200) NOT NULL,
    value               VARCHAR(1024) NOT NULL,
    type                VARCHAR(50) ,
    document_id         VARCHAR(50) NOT NULL,
    tenant_id           VARCHAR(50) NOT NULL,
    created_at          DATETIME    NOT NULL,
    created_by          VARCHAR(50) NOT NULL,
    last_modified_at    DATETIME    NOT NULL,
    last_modified_by    VARCHAR(50) NOT NULL,
    version             INTEGER,
    PRIMARY KEY (property_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
