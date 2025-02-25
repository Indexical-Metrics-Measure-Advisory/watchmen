CREATE TABLE graph_edges
(
    edge_id             VARCHAR(50) NOT NULL,
    label               VARCHAR(50),
    name                VARCHAR(200) NOT NULL,
    properties          CLOB,
    source_node_id      VARCHAR(50) NOT NULL,
    document_id         VARCHAR(50) NOT NULL,
    target_node_id      VARCHAR(50) NOT NULL,
    tenant_id           VARCHAR(50) NOT NULL,
    created_at          DATE    NOT NULL,
    created_by          VARCHAR(50) NOT NULL,
    last_modified_at    DATE    NOT NULL,
    last_modified_by    VARCHAR(50) NOT NULL,
    version             NUMBER(20),
    CONSTRAINT pk_graph_edges PRIMARY KEY (edge_id)
);

CREATE INDEX i_graph_edges_1 ON graph_edges (tenant_id);
CREATE INDEX i_graph_edges_2 ON graph_edges (created_at);
CREATE INDEX i_graph_edges_3 ON graph_edges (created_by);
CREATE INDEX i_graph_edges_4 ON graph_edges (last_modified_at);
CREATE INDEX i_graph_edges_5 ON graph_edges (last_modified_by);

