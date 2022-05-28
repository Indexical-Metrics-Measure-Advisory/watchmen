CREATE TABLE navigations
(
    navigation_id                VARCHAR(50) NOT NULL,
    name                         VARCHAR(50),
    time_range_type              VARCHAR(10),
    time_range_year              VARCHAR(10),
    time_range_month             VARCHAR(10),
    compare_with_prev_time_range SMALLINT,
    indicators                   JSON,
    description                  VARCHAR(1024),
    user_id                      VARCHAR(50) NOT NULL,
    tenant_id                    VARCHAR(50) NOT NULL,
    created_at                   TIMESTAMP   NOT NULL,
    created_by                   VARCHAR(50) NOT NULL,
    last_modified_at             TIMESTAMP   NOT NULL,
    last_modified_by             VARCHAR(50) NOT NULL,
    CONSTRAINT pk_navigations PRIMARY KEY (navigation_id)
);
CREATE INDEX i_navigations_1 ON navigations (name);
CREATE INDEX i_navigations_2 ON navigations (user_id);
CREATE INDEX i_navigations_3 ON navigations (tenant_id);
CREATE INDEX i_navigations_4 ON navigations (created_at);
CREATE INDEX i_navigations_5 ON navigations (created_by);
CREATE INDEX i_navigations_6 ON navigations (last_modified_at);
CREATE INDEX i_navigations_7 ON navigations (last_modified_by);
