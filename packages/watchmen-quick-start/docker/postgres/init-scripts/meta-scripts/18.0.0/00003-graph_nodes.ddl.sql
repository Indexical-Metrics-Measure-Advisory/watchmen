CREATE TABLE graph_nodes
(
    node_id          VARCHAR(50)  NOT NULL,
    label            VARCHAR(50)  NOT NULL,
    name             VARCHAR(200) NOT NULL,
    properties       JSON,
    document_id      VARCHAR(50)  NOT NULL,
    tenant_id        VARCHAR(50)  NOT NULL,
    created_at       TIMESTAMP    NOT NULL,
    created_by       VARCHAR(50)  NOT NULL,
    last_modified_at TIMESTAMP    NOT NULL,
    last_modified_by VARCHAR(50)  NOT NULL,
    version          INTEGER,
    CONSTRAINT pk_graph_nodes PRIMARY KEY (node_id)
);
CREATE INDEX i_graph_nodes_1 ON graph_nodes (tenant_id);
CREATE INDEX i_graph_nodes_2 ON graph_nodes (created_at);
CREATE INDEX i_graph_nodes_3 ON graph_nodes (created_by);
CREATE INDEX i_graph_nodes_4 ON graph_nodes (last_modified_at);
CREATE INDEX i_graph_nodes_5 ON graph_nodes (last_modified_by);


