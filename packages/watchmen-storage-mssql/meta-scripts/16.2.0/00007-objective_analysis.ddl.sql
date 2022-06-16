CREATE TABLE objective_analysis
(
    analysis_id      NVARCHAR(50) NOT NULL,
    title            NVARCHAR(100),
    perspectives     NVARCHAR(MAX),
    description      NVARCHAR(1024),
    user_id          NVARCHAR(50) NOT NULL,
    tenant_id        NVARCHAR(50) NOT NULL,
    last_visit_time  DATETIME     NOT NULL,
    created_at       DATETIME     NOT NULL,
    created_by       NVARCHAR(50) NOT NULL,
    last_modified_at DATETIME     NOT NULL,
    last_modified_by NVARCHAR(50) NOT NULL,
    CONSTRAINT pk_objective_analysis PRIMARY KEY (analysis_id)
);
CREATE INDEX i_objective_analysis_1 ON objective_analysis (title);
CREATE INDEX i_objective_analysis_2 ON objective_analysis (user_id);
CREATE INDEX i_objective_analysis_3 ON objective_analysis (tenant_id);
CREATE INDEX i_objective_analysis_4 ON objective_analysis (created_at);
CREATE INDEX i_objective_analysis_5 ON objective_analysis (created_by);
CREATE INDEX i_objective_analysis_6 ON objective_analysis (last_modified_at);
CREATE INDEX i_objective_analysis_7 ON objective_analysis (last_modified_by);
