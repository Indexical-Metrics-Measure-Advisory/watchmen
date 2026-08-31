CREATE TABLE topic_tags
(
    topic_tag_id     VARCHAR(50) NOT NULL,
    topic_id         VARCHAR(50) NOT NULL,
    tag_name         VARCHAR(50) NOT NULL,
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       TIMESTAMP   NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP   NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    CONSTRAINT pk_topic_tags PRIMARY KEY (topic_tag_id)
);
CREATE INDEX i_topic_tags_1 ON topic_tags (topic_id);
CREATE INDEX i_topic_tags_2 ON topic_tags (tag_name);
CREATE INDEX i_topic_tags_3 ON topic_tags (tenant_id);
CREATE INDEX i_topic_tags_4 ON topic_tags (created_at);
CREATE INDEX i_topic_tags_5 ON topic_tags (created_by);
CREATE INDEX i_topic_tags_6 ON topic_tags (last_modified_at);
CREATE INDEX i_topic_tags_7 ON topic_tags (last_modified_by);
