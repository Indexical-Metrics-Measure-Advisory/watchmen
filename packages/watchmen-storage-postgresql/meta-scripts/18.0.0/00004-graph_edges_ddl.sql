CREATE TABLE graph_edges
(
    tenant_id          VARCHAR(50) NOT NULL,
    edge_id           VARCHAR(50) NOT NULL,
    label               VARCHAR(50),
    name                VARCHAR(200) NOT NULL,
    properties          JSON,
    source_node_id     VARCHAR(50) NOT NULL,
    document_id        VARCHAR(50) NOT NULL,
    target_node_id     VARCHAR(50) NOT NULL,
    created_at         TIMESTAMP    NOT NULL,
    created_by         VARCHAR(50) NOT NULL,
    last_modified_at   TIMESTAMP    NOT NULL,
    last_modified_by   VARCHAR(50) NOT NULL,
    version            BIGINT,
    CONSTRAINT pk_graph_edges PRIMARY KEY (edge_id, tenant_id)
--     PRIMARY KEY (tenant_id, edge_id),
--     INDEX (tenant_id),
--     INDEX (created_at),
--     INDEX (created_by),
--     INDEX (last_modified_at),
--     INDEX (last_modified_by)
);

CREATE INDEX i_graph_edges_1 ON graph_edges (tenant_id);
CREATE INDEX i_graph_edges_2 ON graph_edges (edge_id);
CREATE INDEX i_graph_edges_4 ON graph_edges (created_at);
CREATE INDEX i_graph_edges_5 ON graph_edges (created_by);
CREATE INDEX i_graph_edges_6 ON graph_edges (last_modified_at);
CREATE INDEX i_graph_edges_7 ON graph_edges (last_modified_by);

