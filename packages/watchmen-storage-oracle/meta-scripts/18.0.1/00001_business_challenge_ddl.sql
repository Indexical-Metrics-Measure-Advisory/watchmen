CREATE TABLE business_challenges
(
    id               VARCHAR2(50)  NOT NULL,
    title            VARCHAR2(255) NOT NULL,
    description      VARCHAR2(1000) NOT NULL,
    problemIds      CLOB,
    user_id         VARCHAR2(50)  NOT NULL,
    tenant_id       VARCHAR2(50)  NOT NULL,
    created_at      TIMESTAMP    NOT NULL,
    created_by      VARCHAR2(50)  NOT NULL,
    last_modified_at TIMESTAMP   NOT NULL,
    last_modified_by VARCHAR2(50) NOT NULL,
    version         NUMBER(10),
    CONSTRAINT pk_business_challenges PRIMARY KEY (id)
);

CREATE INDEX idx_business_challenges_tenant_id ON business_challenges (tenant_id);
CREATE INDEX idx_business_challenges_created_at ON business_challenges (created_at);
CREATE INDEX idx_business_challenges_created_by ON business_challenges (created_by);
CREATE INDEX idx_business_challenges_last_modified_at ON business_challenges (last_modified_at);
CREATE INDEX idx_business_challenges_last_modified_by ON business_challenges (last_modified_by);