CREATE TABLE reports
(
    report_id          VARCHAR2(50) NOT NULL,
    name               VARCHAR2(50) NOT NULL,
    connect_id         VARCHAR2(50) NOT NULL,
    subject_id         VARCHAR2(50) NOT NULL,
    description        VARCHAR2(255),
    filters            CLOB,
    funnels            CLOB,
    indicators         CLOB,
    dimensions         CLOB,
    rect               CLOB,
    chart              CLOB,
    simulating         NUMBER(1)    NOT NULL,
    simulate_data      CLOB,
    simulate_thumbnail CLOB,
    user_id            VARCHAR2(50) NOT NULL,
    tenant_id          VARCHAR2(50) NOT NULL,
    last_visit_time    DATE         NOT NULL,
    created_at         DATE         NOT NULL,
    created_by         VARCHAR2(50) NOT NULL,
    last_modified_at   DATE         NOT NULL,
    last_modified_by   VARCHAR2(50) NOT NULL,
    CONSTRAINT pk_reports PRIMARY KEY (report_id)
);
CREATE INDEX i_reports_1 ON reports (name);
CREATE INDEX i_reports_2 ON reports (user_id);
CREATE INDEX i_reports_3 ON reports (tenant_id);
CREATE INDEX i_reports_4 ON reports (created_at);
CREATE INDEX i_reports_5 ON reports (created_by);
CREATE INDEX i_reports_6 ON reports (last_modified_at);
CREATE INDEX i_reports_7 ON reports (last_modified_by);
