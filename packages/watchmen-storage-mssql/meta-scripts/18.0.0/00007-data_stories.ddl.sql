CREATE TABLE data_stories
(
    data_story_id     NVARCHAR(50)  NOT NULL,
    document_name     NVARCHAR(255) NOT NULL,
    status            NVARCHAR(20)  NOT NULL,
    business_question NVARCHAR(MAX),
    sub_questions     NVARCHAR(MAX),
    dimensions        NVARCHAR(MAX),
    tenant_id         NVARCHAR(50)  NOT NULL,
    created_at        DATETIME     NOT NULL,
    created_by        NVARCHAR(50)  NOT NULL,
    last_modified_at  DATETIME     NOT NULL,
    last_modified_by  NVARCHAR(50)  NOT NULL,
    version           INTEGER,
    CONSTRAINT pk_data_stories PRIMARY KEY (data_story_id)
);
CREATE INDEX i_data_stories_1 ON data_stories (tenant_id);
CREATE INDEX i_data_stories_2 ON data_stories (created_at);
CREATE INDEX i_data_stories_3 ON data_stories (created_by);
CREATE INDEX i_data_stories_4 ON data_stories (last_modified_at);
CREATE INDEX i_data_stories_5 ON data_stories (last_modified_by);