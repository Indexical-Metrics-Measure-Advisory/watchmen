CREATE TABLE navigations
(
    navigation_id                NVARCHAR(50) NOT NULL,
    name                         NVARCHAR(50),
    time_range_type              NVARCHAR(10),
    time_range_year              NVARCHAR(10),
    time_range_month             NVARCHAR(10),
    compare_with_prev_time_range DECIMAL(1),
    indicators                   NVARCHAR(MAX),
    description                  NVARCHAR(1024),
    user_id                      NVARCHAR(50) NOT NULL,
    tenant_id                    NVARCHAR(50) NOT NULL,
    created_at                   DATETIME     NOT NULL,
    created_by                   NVARCHAR(50) NOT NULL,
    last_modified_at             DATETIME     NOT NULL,
    last_modified_by             NVARCHAR(50) NOT NULL,
    CONSTRAINT pk_navigations PRIMARY KEY (navigation_id)
);
CREATE INDEX i_navigations_1 ON navigations (name);
CREATE INDEX i_navigations_2 ON navigations (user_id);
CREATE INDEX i_navigations_3 ON navigations (tenant_id);
CREATE INDEX i_navigations_4 ON navigations (created_at);
CREATE INDEX i_navigations_5 ON navigations (created_by);
CREATE INDEX i_navigations_6 ON navigations (last_modified_at);
CREATE INDEX i_navigations_7 ON navigations (last_modified_by);
