CREATE TABLE subjects
(
    subject_id            NVARCHAR(50) NOT NULL,
    name                  NVARCHAR(50) NOT NULL,
    connect_id            NVARCHAR(50) NOT NULL,
    auto_refresh_interval DECIMAL(20),
    dataset               NVARCHAR(MAX),
    user_id               NVARCHAR(50) NOT NULL,
    tenant_id             NVARCHAR(50) NOT NULL,
    last_visit_time       DATETIME     NOT NULL,
    created_at            DATETIME     NOT NULL,
    created_by            NVARCHAR(50) NOT NULL,
    last_modified_at      DATETIME     NOT NULL,
    last_modified_by      NVARCHAR(50) NOT NULL,
    CONSTRAINT pk_subjects PRIMARY KEY (subject_id)
);
CREATE INDEX i_subjects_1 ON subjects (name);
CREATE INDEX i_subjects_2 ON subjects (user_id);
CREATE INDEX i_subjects_3 ON subjects (tenant_id);
CREATE INDEX i_subjects_4 ON subjects (created_at);
CREATE INDEX i_subjects_5 ON subjects (created_by);
CREATE INDEX i_subjects_6 ON subjects (last_modified_at);
CREATE INDEX i_subjects_7 ON subjects (last_modified_by);
