CREATE TABLE last_snapshots
(
    language           NVARCHAR(20),
    last_dashboard_id  NVARCHAR(50),
    admin_dashboard_id NVARCHAR(50),
    favorite_pin       TINYINT,
    tenant_id          NVARCHAR(50) NOT NULL,
    user_id            NVARCHAR(50) NOT NULL,
    last_visit_time    DATETIME     NOT NULL,
    CONSTRAINT pk_last_snapshots PRIMARY KEY (user_id)
);
CREATE INDEX i_last_snapshots_1 ON last_snapshots (tenant_id);
