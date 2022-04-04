CREATE TABLE connected_spaces
(
    connect_id       NVARCHAR(50) NOT NULL,
    space_id         NVARCHAR(50) NOT NULL,
    name             NVARCHAR(50) NOT NULL,
    is_template      TINYINT      NOT NULL,
    user_id          NVARCHAR(50) NOT NULL,
    tenant_id        NVARCHAR(50) NOT NULL,
    last_visit_time  DATETIME     NOT NULL,
    created_at       DATETIME     NOT NULL,
    created_by       NVARCHAR(50) NOT NULL,
    last_modified_at DATETIME     NOT NULL,
    last_modified_by NVARCHAR(50) NOT NULL,
    CONSTRAINT pk_connected_spaces PRIMARY KEY (connect_id)
);
CREATE INDEX i_connected_spaces_1 ON connected_spaces (name);
CREATE INDEX i_connected_spaces_2 ON connected_spaces (space_id);
CREATE INDEX i_connected_spaces_3 ON connected_spaces (user_id);
CREATE INDEX i_connected_spaces_4 ON connected_spaces (tenant_id);
CREATE INDEX i_connected_spaces_5 ON connected_spaces (created_at);
CREATE INDEX i_connected_spaces_6 ON connected_spaces (created_by);
CREATE INDEX i_connected_spaces_7 ON connected_spaces (last_modified_at);
CREATE INDEX i_connected_spaces_8 ON connected_spaces (last_modified_by);
