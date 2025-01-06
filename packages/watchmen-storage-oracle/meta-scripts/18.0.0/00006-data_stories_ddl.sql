CREATE TABLE data_stories
(
    tenant_id         VARCHAR(50)  NOT NULL,
    data_story_id     VARCHAR(50)  NOT NULL,
    document_name     VARCHAR(255) NOT NULL,
    status            VARCHAR(20)  NOT NULL,
    business_question CLOB,
    sub_questions     CLOB,
    dimensions        CLOB,
    created_at        DATE     NOT NULL,
    created_by        VARCHAR(50)  NOT NULL,
    last_modified_at  DATE     NOT NULL,
    last_modified_by  VARCHAR(50)  NOT NULL,
    version           NUMBER(20),
    CONSTRAINT pk_data_stories PRIMARY KEY (data_story_id, tenant_id)
);

CREATE INDEX i_data_stories_1 ON data_stories (tenant_id);
CREATE INDEX i_data_stories_2 ON data_stories (data_story_id);
CREATE INDEX i_data_stories_4 ON data_stories (created_at);
CREATE INDEX i_data_stories_5 ON data_stories (created_by);
CREATE INDEX i_data_stories_6 ON data_stories (last_modified_at);
CREATE INDEX i_data_stories_7 ON data_stories (last_modified_by);
