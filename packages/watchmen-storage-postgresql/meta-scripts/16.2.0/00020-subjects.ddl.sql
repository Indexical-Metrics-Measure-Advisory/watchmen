CREATE TABLE subjects
(
    subject_id            VARCHAR(50) NOT NULL,
    name                  VARCHAR(50) NOT NULL,
    connect_id            VARCHAR(50) NOT NULL,
    auto_refresh_interval DECIMAL(20),
    dataset               JSON,
    user_id               VARCHAR(50) NOT NULL,
    tenant_id             VARCHAR(50) NOT NULL,
    last_visit_time       DATE        NOT NULL,
    created_at            TIMESTAMP   NOT NULL,
    created_by            VARCHAR(50) NOT NULL,
    last_modified_at      TIMESTAMP   NOT NULL,
    last_modified_by      VARCHAR(50) NOT NULL,
    CONSTRAINT pk_subjects PRIMARY KEY (subject_id)
);
CREATE INDEX i_subjects_1 ON subjects (name);
CREATE INDEX i_subjects_2 ON subjects (user_id);
CREATE INDEX i_subjects_3 ON subjects (tenant_id);
CREATE INDEX i_subjects_4 ON subjects (created_at);
CREATE INDEX i_subjects_5 ON subjects (created_by);
CREATE INDEX i_subjects_6 ON subjects (last_modified_at);
CREATE INDEX i_subjects_7 ON subjects (last_modified_by);
