CREATE TABLE data_stories
(
    data_story_id     VARCHAR(50)  NOT NULL,
    document_name     VARCHAR(255) NOT NULL,
    status            VARCHAR(20)  NOT NULL,
    business_question JSON,
    sub_questions     JSON,
    dimensions        JSON,
    tenant_id         VARCHAR(50)  NOT NULL,
    created_at        TIMESTAMP     NOT NULL,
    created_by        VARCHAR(50)  NOT NULL,
    last_modified_at  TIMESTAMP     NOT NULL,
    last_modified_by  VARCHAR(50)  NOT NULL,
    version           INTEGER,
    CONSTRAINT pk_data_stories PRIMARY KEY (data_story_id)
);

CREATE INDEX i_data_stories_1 ON data_stories (tenant_id);
CREATE INDEX i_data_stories_2 ON data_stories (created_at);
CREATE INDEX i_data_stories_3 ON data_stories (created_by);
CREATE INDEX i_data_stories_4 ON data_stories (last_modified_at);
CREATE INDEX i_data_stories_5 ON data_stories (last_modified_by);
