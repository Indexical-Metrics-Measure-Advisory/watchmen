CREATE TABLE topics
(
    topic_id         VARCHAR2(50) NOT NULL,
    name             VARCHAR2(50) NOT NULL,
    description      VARCHAR2(1024),
    type             VARCHAR2(20) NOT NULL,
    kind             VARCHAR2(20) NOT NULL,
    data_source_id   VARCHAR2(50),
    factors          CLOB,
    tenant_id        VARCHAR2(50) NOT NULL,
    created_at       DATE         NOT NULL,
    created_by       VARCHAR2(50) NOT NULL,
    last_modified_at DATE         NOT NULL,
    last_modified_by VARCHAR2(50) NOT NULL,
    version          NUMBER(20),
    CONSTRAINT pk_topics PRIMARY KEY (topic_id)
);
CREATE UNIQUE INDEX u_topics_1 ON topics (name, tenant_id);
CREATE INDEX i_topics_1 ON topics (name);
CREATE INDEX i_topics_2 ON topics (type);
CREATE INDEX i_topics_3 ON topics (kind);
CREATE INDEX i_topics_4 ON topics (data_source_id);
CREATE INDEX i_topics_5 ON topics (tenant_id);
CREATE INDEX i_topics_6 ON topics (created_at);
CREATE INDEX i_topics_7 ON topics (created_by);
CREATE INDEX i_topics_8 ON topics (last_modified_at);
CREATE INDEX i_topics_9 ON topics (last_modified_by);
