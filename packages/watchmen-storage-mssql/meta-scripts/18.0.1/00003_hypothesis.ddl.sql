CREATE TABLE hypotheses
(
    id               VARCHAR(50)  NOT NULL,
    title            VARCHAR(255) NOT NULL,
    description      VARCHAR(1000) NOT NULL,
    status         VARCHAR(50) NOT NULL,
    confidence      DECIMAL(4,2),
    metrics         NVARCHAR(MAX),
    metrics_details NVARCHAR(MAX),
    related_hypotheses_ids NVARCHAR(MAX),
    business_problem_id  VARCHAR(50) NOT NULL,
    user_id         VARCHAR(50)  NOT NULL,
    tenant_id       VARCHAR(50)  NOT NULL,
    created_at      DATETIME2    NOT NULL,
    created_by      VARCHAR(50)  NOT NULL,
    last_modified_at DATETIME2   NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    analysis_method  VARCHAR(50) NOT NULL,
    version         INT,

    PRIMARY KEY (id)
);

CREATE INDEX idx_hypotheses_tenant_id ON hypotheses (tenant_id);
CREATE INDEX idx_hypotheses_created_at ON hypotheses (created_at);
CREATE INDEX idx_hypotheses_created_by ON hypotheses (created_by);
CREATE INDEX idx_hypotheses_last_modified_at ON hypotheses (last_modified_at);
CREATE INDEX idx_hypotheses_last_modified_by ON hypotheses (last_modified_by);