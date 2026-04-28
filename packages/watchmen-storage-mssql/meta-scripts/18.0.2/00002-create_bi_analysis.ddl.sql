CREATE TABLE bi_analysis (
    id NVARCHAR(50) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    description NVARCHAR(1024),
    cards NVARCHAR(MAX),
    tenant_id NVARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL,
    created_by NVARCHAR(50) NOT NULL,
    last_modified_at DATETIME NOT NULL,
    last_modified_by NVARCHAR(50) NOT NULL,
    user_id NVARCHAR(50) NOT NULL,
    isTemplate SMALLINT NOT NULL DEFAULT 0,
    version INT DEFAULT 1,
    CONSTRAINT pk_bi_analysis PRIMARY KEY (id)
);
CREATE UNIQUE INDEX u_bi_analysis_1 ON bi_analysis (name, tenant_id);
CREATE INDEX i_bi_analysis_1 ON bi_analysis (tenant_id);
