CREATE TABLE spaces
(
    space_id         VARCHAR(50) NOT NULL,
    name             VARCHAR(50) NOT NULL,
    description      VARCHAR(1024),
    topic_ids        JSON,
    group_ids        JSON,
    filters          JSON,
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       TIMESTAMP   NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP   NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_spaces PRIMARY KEY (space_id)
);
CREATE INDEX i_spaces_1 ON spaces (name);
CREATE INDEX i_spaces_2 ON spaces (tenant_id);
CREATE INDEX i_spaces_3 ON spaces (created_at);
CREATE INDEX i_spaces_4 ON spaces (created_by);
CREATE INDEX i_spaces_5 ON spaces (last_modified_at);
CREATE INDEX i_spaces_6 ON spaces (last_modified_by);
