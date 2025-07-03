CREATE TABLE graph_nodes
(
    node_id             NVARCHAR(50) NOT NULL,
    label               NVARCHAR(50) NOT NULL,
    name                NVARCHAR(200) NOT NULL,
    properties          NVARCHAR(MAX),
    document_id         NVARCHAR(50) NOT NULL,
    tenant_id           NVARCHAR(50) NOT NULL,
    created_at          DATETIME    NOT NULL,
    created_by          NVARCHAR(50) NOT NULL,
    last_modified_at    DATETIME    NOT NULL,
    last_modified_by    NVARCHAR(50) NOT NULL,
    version             INTEGER,
    CONSTRAINT pk_graph_nodes PRIMARY KEY (node_id)
);
CREATE INDEX i_graph_nodes_1 ON graph_nodes (tenant_id);
CREATE INDEX i_graph_nodes_2 ON graph_nodes (created_at);
CREATE INDEX i_graph_nodes_3 ON graph_nodes (created_by);
CREATE INDEX i_graph_nodes_4 ON graph_nodes (last_modified_at);
CREATE INDEX i_graph_nodes_5 ON graph_nodes (last_modified_by);