CREATE TABLE dashboards
(
    dashboard_id          VARCHAR(50) NOT NULL,
    name                  VARCHAR(50) NOT NULL,
    reports               JSON,
    paragraphs            JSON,
    auto_refresh_interval DECIMAL(20),
    user_id               VARCHAR(50) NOT NULL,
    tenant_id             VARCHAR(50) NOT NULL,
    last_visit_time       DATE        NOT NULL,
    created_at            TIMESTAMP   NOT NULL,
    created_by            VARCHAR(50) NOT NULL,
    last_modified_at      TIMESTAMP   NOT NULL,
    last_modified_by      VARCHAR(50) NOT NULL,
    CONSTRAINT pk_dashboards PRIMARY KEY (dashboard_id)
);
CREATE INDEX i_dashboards_1 ON dashboards (name);
CREATE INDEX i_dashboards_2 ON dashboards (user_id);
CREATE INDEX i_dashboards_3 ON dashboards (tenant_id);
CREATE INDEX i_dashboards_4 ON dashboards (created_at);
CREATE INDEX i_dashboards_5 ON dashboards (created_by);
CREATE INDEX i_dashboards_6 ON dashboards (last_modified_at);
CREATE INDEX i_dashboards_7 ON dashboards (last_modified_by);
