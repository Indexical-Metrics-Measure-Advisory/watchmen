CREATE TABLE reports
(
    report_id          VARCHAR(50) NOT NULL,
    name               VARCHAR(50) NOT NULL,
    connect_id         VARCHAR(50) NOT NULL,
    subject_id         VARCHAR(50) NOT NULL,
    description        VARCHAR(1024),
    filters            JSON,
    funnels            JSON,
    indicators         JSON,
    dimensions         JSON,
    rect               JSON,
    chart              JSON,
    simulating         SMALLINT    NOT NULL,
    simulate_data      JSON,
    simulate_thumbnail TEXT,
    user_id            VARCHAR(50) NOT NULL,
    tenant_id          VARCHAR(50) NOT NULL,
    last_visit_time    TIMESTAMP   NOT NULL,
    created_at         TIMESTAMP   NOT NULL,
    created_by         VARCHAR(50) NOT NULL,
    last_modified_at   TIMESTAMP   NOT NULL,
    last_modified_by   VARCHAR(50) NOT NULL,
    CONSTRAINT pk_reports PRIMARY KEY (report_id)
);
CREATE INDEX i_reports_1 ON reports (name);
CREATE INDEX i_reports_2 ON reports (user_id);
CREATE INDEX i_reports_3 ON reports (tenant_id);
CREATE INDEX i_reports_4 ON reports (created_at);
CREATE INDEX i_reports_5 ON reports (created_by);
CREATE INDEX i_reports_6 ON reports (last_modified_at);
CREATE INDEX i_reports_7 ON reports (last_modified_by);
