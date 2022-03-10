CREATE TABLE last_snapshots
(
    language           VARCHAR2(20),
    last_dashboard_id  VARCHAR2(50),
    admin_dashboard_id VARCHAR2(50),
    favorite_pin       NUMBER(1),
    tenant_id          VARCHAR2(50) NOT NULL,
    user_id            VARCHAR2(50) NOT NULL,
    last_visit_time    DATE         NOT NULL,
    CONSTRAINT pk_last_snapshots PRIMARY KEY (user_id)
);
CREATE INDEX i_last_snapshots_1 ON last_snapshots (tenant_id);
