CREATE TABLE topics
(
    topic_id         NVARCHAR(50) NOT NULL,
    name             NVARCHAR(50) NOT NULL,
    description      NVARCHAR(1024),
    type             NVARCHAR(20) NOT NULL,
    kind             NVARCHAR(20) NOT NULL,
    data_source_id   NVARCHAR(50),
    factors          NVARCHAR(MAX),
    tenant_id        NVARCHAR(50) NOT NULL,
    created_at       DATETIME     NOT NULL,
    created_by       NVARCHAR(50) NOT NULL,
    last_modified_at DATETIME     NOT NULL,
    last_modified_by NVARCHAR(50) NOT NULL,
    version          DECIMAL(20),
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
