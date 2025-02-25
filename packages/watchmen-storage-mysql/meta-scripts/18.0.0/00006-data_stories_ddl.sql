CREATE TABLE data_stories
(
    data_story_id     VARCHAR(50)  NOT NULL,
    document_name     VARCHAR(255) NOT NULL,
    status            VARCHAR(20)  NOT NULL,
    business_question JSON,
    sub_questions     JSON,
    dimensions        JSON,
    tenant_id         VARCHAR(50)  NOT NULL,
    created_at        DATETIME     NOT NULL,
    created_by        VARCHAR(50)  NOT NULL,
    last_modified_at  DATETIME     NOT NULL,
    last_modified_by  VARCHAR(50)  NOT NULL,
    version           INTEGER,
    PRIMARY KEY (data_story_id),
    INDEX (tenant_id) ,
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
