CREATE TABLE graph_edges
(
    edge_id             NVARCHAR(50) NOT NULL,
    label               NVARCHAR(50),
    name                NVARCHAR(200) NOT NULL,
    properties          NVARCHAR(MAX),
    source_node_id      NVARCHAR(50) NOT NULL,
    document_id         NVARCHAR(50) NOT NULL,
    target_node_id      NVARCHAR(50) NOT NULL,
    tenant_id           NVARCHAR(50) NOT NULL,
    created_at          DATETIME    NOT NULL,
    created_by          NVARCHAR(50) NOT NULL,
    last_modified_at    DATETIME    NOT NULL,
    last_modified_by    NVARCHAR(50) NOT NULL,
    version             INTEGER,
    CONSTRAINT pk_graph_edges PRIMARY KEY (edge_id)
);
CREATE INDEX i_graph_edges_1 ON graph_edges (tenant_id);
CREATE INDEX i_graph_edges_2 ON graph_edges (created_at);
CREATE INDEX i_graph_edges_3 ON graph_edges (created_by);
CREATE INDEX i_graph_edges_4 ON graph_edges (last_modified_at);
CREATE INDEX i_graph_edges_5 ON graph_edges (last_modified_by);