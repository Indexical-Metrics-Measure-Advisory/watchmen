CREATE TABLE graph_properties
(
    tenant_id        VARCHAR(50)   NOT NULL,
    property_id      VARCHAR(50)   NOT NULL,
    node_id          VARCHAR(50),
    edge_id          VARCHAR(50),
    name             VARCHAR(200)  NOT NULL,
    value            VARCHAR(1024) NOT NULL,
    type             VARCHAR(50),
    document_id      VARCHAR(50)   NOT NULL,
    created_at       TIMESTAMP     NOT NULL,
    created_by       VARCHAR(50)   NOT NULL,
    last_modified_at TIMESTAMP     NOT NULL,
    last_modified_by VARCHAR(50)   NOT NULL,
    version          BIGINT,
    CONSTRAINT pk_graph_properties PRIMARY KEY (property_id, tenant_id)
--     PRIMARY KEY (tenant_id, property_id),
--     INDEX (tenant_id),
--     INDEX (created_at),
--     INDEX (created_by),
--     INDEX (last_modified_at),
--     INDEX (last_modified_by)
);

CREATE INDEX i_graph_properties_1 ON graph_properties (tenant_id);
CREATE INDEX i_graph_properties_2 ON graph_properties (property_id);
CREATE INDEX i_graph_properties_4 ON graph_properties (created_at);
CREATE INDEX i_graph_properties_5 ON graph_properties (created_by);
CREATE INDEX i_graph_properties_6 ON graph_properties (last_modified_at);
CREATE INDEX i_graph_properties_7 ON graph_properties (last_modified_by);
