CREATE TABLE topic_archive_policies
(
    policy_id                 NVARCHAR(50) NOT NULL,
    topic_id                  NVARCHAR(50) NOT NULL,
    enabled                   DECIMAL(1),
    hot_days                  INT          NOT NULL,
    cold_days                 INT,
    archive_data_source_id    NVARCHAR(50) NOT NULL,
    batch_size                INT          NOT NULL,
    filter                    NVARCHAR(MAX),
    destroy_requires_approval DECIMAL(1),
    tenant_id                 NVARCHAR(50) NOT NULL,
    created_at                DATETIME     NOT NULL,
    created_by                NVARCHAR(50) NOT NULL,
    last_modified_at          DATETIME     NOT NULL,
    last_modified_by          NVARCHAR(50) NOT NULL,
    version                   DECIMAL(20),
    CONSTRAINT pk_topic_archive_policies PRIMARY KEY (policy_id)
);
CREATE INDEX i_topic_archive_policies_1 ON topic_archive_policies (topic_id);
CREATE INDEX i_topic_archive_policies_2 ON topic_archive_policies (tenant_id);

CREATE TABLE archive_batches
(
    batch_id         NVARCHAR(50) NOT NULL,
    policy_id        NVARCHAR(50) NOT NULL,
    topic_id         NVARCHAR(50) NOT NULL,
    time_from        DATETIME,
    time_to          DATETIME,
    row_count        DECIMAL(20) NOT NULL,
    checksum         NVARCHAR(64),
    storage_uri      NVARCHAR(256),
    status           NVARCHAR(20) NOT NULL,
    error_message    NVARCHAR(1024),
    archived_at      DATETIME,
    tenant_id        NVARCHAR(50) NOT NULL,
    created_at       DATETIME    NOT NULL,
    created_by       NVARCHAR(50) NOT NULL,
    last_modified_at DATETIME    NOT NULL,
    last_modified_by NVARCHAR(50) NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_archive_batches PRIMARY KEY (batch_id)
);
CREATE INDEX i_archive_batches_1 ON archive_batches (topic_id);
CREATE INDEX i_archive_batches_2 ON archive_batches (policy_id);
CREATE INDEX i_archive_batches_3 ON archive_batches (status);
CREATE INDEX i_archive_batches_4 ON archive_batches (tenant_id);
CREATE INDEX i_archive_batches_5 ON archive_batches (time_from);
CREATE INDEX i_archive_batches_6 ON archive_batches (time_to);
