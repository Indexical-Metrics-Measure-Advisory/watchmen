CREATE TABLE favorites
(
    connected_space_ids VARCHAR2(2048),
    dashboard_ids       VARCHAR2(2048),
    tenant_id           VARCHAR2(50) NOT NULL,
    user_id             VARCHAR2(50) NOT NULL,
    last_visit_time     DATE         NOT NULL,
    CONSTRAINT pk_favorites PRIMARY KEY (user_id)
);
CREATE INDEX i_favorites_1 ON favorites (tenant_id);
