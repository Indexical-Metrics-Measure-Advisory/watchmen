CREATE TABLE topic_archive_policies
(
    policy_id                 VARCHAR(50) NOT NULL,
    topic_id                  VARCHAR(50) NOT NULL,
    enabled                   TINYINT,
    hot_days                  INT         NOT NULL,
    cold_days                 INT,
    archive_data_source_id    VARCHAR(50) NOT NULL,
    batch_size                INT         NOT NULL,
    destroy_requires_approval TINYINT,
    tenant_id                 VARCHAR(50) NOT NULL,
    created_at                DATETIME    NOT NULL,
    created_by                VARCHAR(50) NOT NULL,
    last_modified_at          DATETIME    NOT NULL,
    last_modified_by          VARCHAR(50) NOT NULL,
    version                   BIGINT,
    PRIMARY KEY (policy_id),
    INDEX (topic_id),
    INDEX (tenant_id)
);

CREATE TABLE archive_batches
(
    batch_id         VARCHAR(50) NOT NULL,
    policy_id        VARCHAR(50) NOT NULL,
    topic_id         VARCHAR(50) NOT NULL,
    time_from        DATETIME,
    time_to          DATETIME,
    row_count        BIGINT      NOT NULL,
    checksum         VARCHAR(64),
    storage_uri      VARCHAR(256),
    status           VARCHAR(20) NOT NULL,
    error_message    VARCHAR(1024),
    archived_at      DATETIME,
    tenant_id        VARCHAR(50) NOT NULL,
    created_at       DATETIME    NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at DATETIME    NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    version          BIGINT,
    PRIMARY KEY (batch_id),
    INDEX (topic_id),
    INDEX (policy_id),
    INDEX (status),
    INDEX (tenant_id),
    INDEX (time_from),
    INDEX (time_to)
);
