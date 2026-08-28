CREATE TABLE tags
(
    tag_id           VARCHAR(50) NOT NULL,
    name             VARCHAR(50) NOT NULL,
    type             VARCHAR(20) NOT NULL,
    description      VARCHAR(1024),
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       TIMESTAMP   NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP   NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_tags PRIMARY KEY (tag_id)
);
CREATE INDEX i_tags_1 ON tags (name);
CREATE INDEX i_tags_2 ON tags (type);
CREATE INDEX i_tags_3 ON tags (tenant_id);
CREATE INDEX i_tags_4 ON tags (created_at);
CREATE INDEX i_tags_5 ON tags (created_by);
CREATE INDEX i_tags_6 ON tags (last_modified_at);
CREATE INDEX i_tags_7 ON tags (last_modified_by);
