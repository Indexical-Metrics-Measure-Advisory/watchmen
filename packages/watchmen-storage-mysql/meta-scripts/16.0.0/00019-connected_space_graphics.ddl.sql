CREATE TABLE connected_space_graphics
(
    connect_id VARCHAR(50) NOT NULL,
    topics     JSON,
    subjects   JSON,
    user_id    VARCHAR(50) NOT NULL,
    tenant_id  VARCHAR(50) NOT NULL,
    PRIMARY KEY (connect_id),
    INDEX (user_id),
    INDEX (tenant_id)
);
