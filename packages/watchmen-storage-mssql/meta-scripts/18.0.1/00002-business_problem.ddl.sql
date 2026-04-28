CREATE TABLE business_problems
(
    id               VARCHAR(50)  NOT NULL,
    title            VARCHAR(255) NOT NULL,
    description      VARCHAR(1000) NOT NULL,
    hypothesisIds      NVARCHAR(MAX),
    businessChallengeId VARCHAR(50) NOT NULL,
    status         VARCHAR(50) NOT NULL,
    aiAnswer        VARCHAR(2000) NOT NULL,
    user_id         VARCHAR(50)  NOT NULL,
    tenant_id       VARCHAR(50)  NOT NULL,
    created_at      DATETIME2    NOT NULL,
    created_by      VARCHAR(50)  NOT NULL,
    last_modified_at DATETIME2   NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    dataset_end_date DATETIME2 ,
    dataset_start_date DATETIME2,
    version         INT,
    PRIMARY KEY (id)
);

CREATE INDEX idx_business_problems_tenant_id ON business_problems (tenant_id);
CREATE INDEX idx_business_problems_created_at ON business_problems (created_at);
CREATE INDEX idx_business_problems_created_by ON business_problems (created_by);
CREATE INDEX idx_business_problems_last_modified_at ON business_problems (last_modified_at);
CREATE INDEX idx_business_problems_last_modified_by ON business_problems (last_modified_by);