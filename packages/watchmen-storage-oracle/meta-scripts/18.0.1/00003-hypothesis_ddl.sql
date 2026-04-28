CREATE TABLE hypotheses
(
    id               VARCHAR2(50)  NOT NULL,
    title            VARCHAR2(255) NOT NULL,
    description      VARCHAR2(1000) NOT NULL,
    status         VARCHAR2(50) NOT NULL,
    confidence      NUMBER(4,2),
    metrics         CLOB,
    metrics_details CLOB,
    related_hypotheses_ids CLOB,
    business_problem_id  VARCHAR2(50) NOT NULL,
    user_id         VARCHAR2(50)  NOT NULL,
    tenant_id       VARCHAR2(50)  NOT NULL,
    created_at      DATE    NOT NULL,
    created_by      VARCHAR2(50)  NOT NULL,
    last_modified_at DATE   NOT NULL,
    last_modified_by VARCHAR2(50) NOT NULL,
    analysis_method  VARCHAR2(50) NOT NULL,
    version         NUMBER(10),

    CONSTRAINT pk_hypotheses PRIMARY KEY (id)
);

CREATE INDEX idx_hypotheses_tenant_id ON hypotheses (tenant_id);
CREATE INDEX idx_hypotheses_created_at ON hypotheses (created_at);
CREATE INDEX idx_hypotheses_created_by ON hypotheses (created_by);
CREATE INDEX idx_hypotheses_last_modified_at ON hypotheses (last_modified_at);
CREATE INDEX idx_hypotheses_last_modified_by ON hypotheses (last_modified_by);