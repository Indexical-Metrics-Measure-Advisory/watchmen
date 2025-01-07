CREATE TABLE data_stories
(
    tenant_id         VARCHAR(50)  NOT NULL,
    data_story_id     VARCHAR(50)  NOT NULL,
    document_name     VARCHAR(255) NOT NULL,
    status            VARCHAR(20)  NOT NULL,
    business_question JSON,
    sub_questions     JSON,
    dimensions        JSON,
    created_at        DATETIME     NOT NULL,
    created_by        VARCHAR(50)  NOT NULL,
    last_modified_at  DATETIME     NOT NULL,
    last_modified_by  VARCHAR(50)  NOT NULL,
    version           BIGINT,
    PRIMARY KEY (tenant_id,data_story_id ),
    INDEX (tenant_id) ,
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
