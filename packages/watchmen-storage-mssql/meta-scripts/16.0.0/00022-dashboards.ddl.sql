CREATE TABLE dashboards
(
    dashboard_id          NVARCHAR(50) NOT NULL,
    name                  NVARCHAR(50) NOT NULL,
    reports               NVARCHAR(MAX),
    paragraphs            NVARCHAR(MAX),
    auto_refresh_interval DECIMAL(20),
    user_id               NVARCHAR(50) NOT NULL,
    tenant_id             NVARCHAR(50) NOT NULL,
    last_visit_time       DATETIME     NOT NULL,
    created_at            DATETIME     NOT NULL,
    created_by            NVARCHAR(50) NOT NULL,
    last_modified_at      DATETIME     NOT NULL,
    last_modified_by      NVARCHAR(50) NOT NULL,
    CONSTRAINT pk_dashboards PRIMARY KEY (dashboard_id)
);
CREATE INDEX i_dashboards_1 ON dashboards (name);
CREATE INDEX i_dashboards_2 ON dashboards (user_id);
CREATE INDEX i_dashboards_3 ON dashboards (tenant_id);
CREATE INDEX i_dashboards_4 ON dashboards (created_at);
CREATE INDEX i_dashboards_5 ON dashboards (created_by);
CREATE INDEX i_dashboards_6 ON dashboards (last_modified_at);
CREATE INDEX i_dashboards_7 ON dashboards (last_modified_by);
