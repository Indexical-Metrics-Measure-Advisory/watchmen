CREATE TABLE achievements
(
    achievement_id               VARCHAR2(50) NOT NULL,
    name                         VARCHAR2(50),
    time_range_type              VARCHAR2(10),
    time_range_year              VARCHAR2(10),
    time_range_month             VARCHAR2(10),
    compare_with_prev_time_range NUMBER(1),
    indicators                   CLOB,
    description                  VARCHAR2(1024),
    user_id                      VARCHAR2(50) NOT NULL,
    tenant_id                    VARCHAR2(50) NOT NULL,
    created_at                   DATE         NOT NULL,
    created_by                   VARCHAR2(50) NOT NULL,
    last_modified_at             DATE         NOT NULL,
    last_modified_by             VARCHAR2(50) NOT NULL,
    CONSTRAINT pk_achievements PRIMARY KEY (achievement_id)
);
CREATE INDEX i_achievements_1 ON achievements (name);
CREATE INDEX i_achievements_2 ON achievements (user_id);
CREATE INDEX i_achievements_3 ON achievements (tenant_id);
CREATE INDEX i_achievements_4 ON achievements (created_at);
CREATE INDEX i_achievements_5 ON achievements (created_by);
CREATE INDEX i_achievements_6 ON achievements (last_modified_at);
CREATE INDEX i_achievements_7 ON achievements (last_modified_by);
