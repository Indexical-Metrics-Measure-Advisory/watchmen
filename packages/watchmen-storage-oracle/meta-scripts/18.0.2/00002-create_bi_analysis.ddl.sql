CREATE TABLE bi_analysis (
    id VARCHAR2(50) NOT NULL,
    name VARCHAR2(255) NOT NULL,
    description VARCHAR2(1024),
    cards CLOB,
    tenant_id VARCHAR2(50) NOT NULL,
    created_at DATE NOT NULL,
    created_by VARCHAR2(50) NOT NULL,
    last_modified_at DATE NOT NULL,
    last_modified_by VARCHAR2(50) NOT NULL,
    user_id VARCHAR2(50) NOT NULL,
    isTemplate NUMBER(1) DEFAULT 0 NOT NULL,
    version NUMBER(20) DEFAULT 1,
    CONSTRAINT pk_bi_analysis PRIMARY KEY (id)
);

CREATE UNIQUE INDEX u_bi_analysis_1 ON bi_analysis (name, tenant_id);
CREATE INDEX i_bi_analysis_1 ON bi_analysis (tenant_id);
