CREATE TABLE spaces
(
    space_id         VARCHAR2(50) NOT NULL,
    name             VARCHAR2(50) NOT NULL,
    description      VARCHAR2(1024),
    topic_ids        VARCHAR2(2048),
    group_ids        VARCHAR2(2048),
    filters          CLOB,
    tenant_id        VARCHAR2(50) NOT NULL,
    created_at       DATE         NOT NULL,
    created_by       VARCHAR2(50) NOT NULL,
    last_modified_at DATE         NOT NULL,
    last_modified_by VARCHAR2(50) NOT NULL,
    version          NUMBER(20),
    CONSTRAINT pk_spaces PRIMARY KEY (space_id)
);
CREATE INDEX i_spaces_1 ON spaces (name);
CREATE INDEX i_spaces_2 ON spaces (tenant_id);
CREATE INDEX i_spaces_3 ON spaces (created_at);
CREATE INDEX i_spaces_4 ON spaces (created_by);
CREATE INDEX i_spaces_5 ON spaces (last_modified_at);
CREATE INDEX i_spaces_6 ON spaces (last_modified_by);
