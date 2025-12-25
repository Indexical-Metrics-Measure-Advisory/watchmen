CREATE TABLE connected_space_graphics
(
    connect_id VARCHAR(50) NOT NULL,
    topics     JSON,
    subjects   JSON,
    user_id    VARCHAR(50) NOT NULL,
    tenant_id  VARCHAR(50) NOT NULL,
    CONSTRAINT pk_connected_space_graphics PRIMARY KEY (connect_id)
);
CREATE INDEX i_connected_space_graphics_1 ON connected_space_graphics (user_id);
CREATE INDEX i_connected_space_graphics_2 ON connected_space_graphics (tenant_id);
