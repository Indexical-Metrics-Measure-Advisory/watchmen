CREATE TABLE business_challenges
(
    id               VARCHAR(50)  NOT NULL,
    title            VARCHAR(255) NOT NULL,
    description      VARCHAR(1000) NOT NULL,
    problemIds      JSONB,
    user_id         VARCHAR(50)  NOT NULL,
    tenant_id       VARCHAR(50)  NOT NULL,
    created_at      TIMESTAMP    NOT NULL,
    created_by      VARCHAR(50)  NOT NULL,
    last_modified_at TIMESTAMP   NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version         INTEGER,
    PRIMARY KEY (id)
);

CREATE INDEX idx_business_challenges_tenant_id ON business_challenges (tenant_id);
CREATE INDEX idx_business_challenges_created_at ON business_challenges (created_at);
CREATE INDEX idx_business_challenges_created_by ON business_challenges (created_by);
CREATE INDEX idx_business_challenges_last_modified_at ON business_challenges (last_modified_at);
CREATE INDEX idx_business_challenges_last_modified_by ON business_challenges (last_modified_by);