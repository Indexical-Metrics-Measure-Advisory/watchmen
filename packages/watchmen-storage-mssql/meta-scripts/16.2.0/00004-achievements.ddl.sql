CREATE TABLE achievements
(
    achievement_id               NVARCHAR(50) NOT NULL,
    name                         NVARCHAR(50),
    time_range_type              NVARCHAR(10),
    time_range_year              NVARCHAR(10),
    time_range_month             NVARCHAR(10),
    compare_with_prev_time_range DECIMAL(1),
    final_score_is_ratio         DECIMAL(1),
    indicators                   NVARCHAR(MAX),
    description                  NVARCHAR(1024),
    user_id                      NVARCHAR(50) NOT NULL,
    tenant_id                    NVARCHAR(50) NOT NULL,
    created_at                   DATETIME     NOT NULL,
    created_by                   NVARCHAR(50) NOT NULL,
    last_modified_at             DATETIME     NOT NULL,
    last_modified_by             NVARCHAR(50) NOT NULL,
    CONSTRAINT pk_achievements PRIMARY KEY (achievement_id)
);
CREATE INDEX i_achievements_1 ON achievements (name);
CREATE INDEX i_achievements_2 ON achievements (user_id);
CREATE INDEX i_achievements_3 ON achievements (tenant_id);
CREATE INDEX i_achievements_4 ON achievements (created_at);
CREATE INDEX i_achievements_5 ON achievements (created_by);
CREATE INDEX i_achievements_6 ON achievements (last_modified_at);
CREATE INDEX i_achievements_7 ON achievements (last_modified_by);
