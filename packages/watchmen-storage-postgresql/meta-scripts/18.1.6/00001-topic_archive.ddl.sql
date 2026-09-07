CREATE TABLE topic_archive_policies
(
    policy_id                 VARCHAR(50) NOT NULL,
    topic_id                  VARCHAR(50) NOT NULL,
    enabled                   SMALLINT,
    hot_days                  INTEGER     NOT NULL,
    cold_days                 INTEGER,
    archive_data_source_id    VARCHAR(50) NOT NULL,
    batch_size                INTEGER     NOT NULL,
    destroy_requires_approval SMALLINT,
    tenant_id                 VARCHAR(50) NOT NULL,
    created_at                TIMESTAMP   NOT NULL,
    created_by                VARCHAR(50) NOT NULL,
    last_modified_at          TIMESTAMP   NOT NULL,
    last_modified_by          VARCHAR(50) NOT NULL,
    version                   DECIMAL(20),
    CONSTRAINT pk_topic_archive_policies PRIMARY KEY (policy_id)
);
CREATE INDEX i_topic_archive_policies_1 ON topic_archive_policies (topic_id);
CREATE INDEX i_topic_archive_policies_2 ON topic_archive_policies (tenant_id);

CREATE TABLE archive_batches
(
    batch_id         VARCHAR(50) NOT NULL,
    policy_id        VARCHAR(50) NOT NULL,
    topic_id         VARCHAR(50) NOT NULL,
    time_from        TIMESTAMP,
    time_to          TIMESTAMP,
    row_count        DECIMAL(20) NOT NULL,
    checksum         VARCHAR(64),
    storage_uri      VARCHAR(256),
    status           VARCHAR(20) NOT NULL,
    error_message    VARCHAR(1024),
    archived_at      TIMESTAMP,
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       TIMESTAMP   NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at TIMESTAMP   NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_archive_batches PRIMARY KEY (batch_id)
);
CREATE INDEX i_archive_batches_1 ON archive_batches (topic_id);
CREATE INDEX i_archive_batches_2 ON archive_batches (policy_id);
CREATE INDEX i_archive_batches_3 ON archive_batches (status);
CREATE INDEX i_archive_batches_4 ON archive_batches (tenant_id);
CREATE INDEX i_archive_batches_5 ON archive_batches (time_from);
CREATE INDEX i_archive_batches_6 ON archive_batches (time_to);
