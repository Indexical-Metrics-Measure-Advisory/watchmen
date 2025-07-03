CREATE TABLE graph_properties
(
    property_id         NVARCHAR(50) NOT NULL,
    node_id             NVARCHAR(50) ,
    edge_id             NVARCHAR(50),
    name                NVARCHAR(200) NOT NULL,
    value               NVARCHAR(1024) NOT NULL,
    type                NVARCHAR(50) ,
    document_id         NVARCHAR(50) NOT NULL,
    tenant_id           NVARCHAR(50) NOT NULL,
    created_at          DATETIME    NOT NULL,
    created_by          NVARCHAR(50) NOT NULL,
    last_modified_at    DATETIME    NOT NULL,
    last_modified_by    NVARCHAR(50) NOT NULL,
    version             INTEGER,
    CONSTRAINT pk_graph_properties PRIMARY KEY (property_id)
);
CREATE INDEX i_graph_properties_1 ON graph_properties (tenant_id);
CREATE INDEX i_graph_properties_2 ON graph_properties (created_at);
CREATE INDEX i_graph_properties_3 ON graph_properties (created_by);
CREATE INDEX i_graph_properties_4 ON graph_properties (last_modified_at);
CREATE INDEX i_graph_properties_5 ON graph_properties (last_modified_by);