CREATE TABLE connected_spaces
(
    connect_id       VARCHAR(50) NOT NULL,
    space_id         VARCHAR(50) NOT NULL,
    name             VARCHAR(50) NOT NULL,
    is_template      TINYINT(1)  NOT NULL,
    user_id          VARCHAR(50) NOT NULL,
    tenant_id        VARCHAR(50) NOT NULL,
    last_visit_time  DATETIME    NOT NULL,
    created_at       DATETIME    NOT NULL,
    created_by       VARCHAR(50) NOT NULL,
    last_modified_at DATETIME    NOT NULL,
    last_modified_by VARCHAR(50) NOT NULL,
    PRIMARY KEY (connect_id),
    INDEX (name),
    INDEX (space_id),
    INDEX (user_id),
    INDEX (tenant_id),
    INDEX (created_at),
    INDEX (created_by),
    INDEX (last_modified_at),
    INDEX (last_modified_by)
);
