CREATE TABLE reports
(
    report_id          NVARCHAR(50) NOT NULL,
    name               NVARCHAR(50) NOT NULL,
    connect_id         NVARCHAR(50) NOT NULL,
    subject_id         NVARCHAR(50) NOT NULL,
    description        NVARCHAR(1024),
    filters            NVARCHAR(MAX),
    funnels            NVARCHAR(MAX),
    indicators         NVARCHAR(MAX),
    dimensions         NVARCHAR(MAX),
    rect               NVARCHAR(MAX),
    chart              NVARCHAR(MAX),
    simulating         TINYINT      NOT NULL,
    simulate_data      NVARCHAR(MAX),
    simulate_thumbnail NVARCHAR(MAX),
    user_id            NVARCHAR(50) NOT NULL,
    tenant_id          NVARCHAR(50) NOT NULL,
    last_visit_time    DATETIME     NOT NULL,
    created_at         DATETIME     NOT NULL,
    created_by         NVARCHAR(50) NOT NULL,
    last_modified_at   DATETIME     NOT NULL,
    last_modified_by   NVARCHAR(50) NOT NULL,
    CONSTRAINT pk_reports PRIMARY KEY (report_id)
);
CREATE INDEX i_reports_1 ON reports (name);
CREATE INDEX i_reports_2 ON reports (user_id);
CREATE INDEX i_reports_3 ON reports (tenant_id);
CREATE INDEX i_reports_4 ON reports (created_at);
CREATE INDEX i_reports_5 ON reports (created_by);
CREATE INDEX i_reports_6 ON reports (last_modified_at);
CREATE INDEX i_reports_7 ON reports (last_modified_by);
