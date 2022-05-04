CREATE TABLE favorites
(
    connected_space_ids JSON,
    dashboard_ids       JSON,
    tenant_id           VARCHAR(50) NOT NULL,
    user_id             VARCHAR(50) NOT NULL,
    last_visit_time     DATE        NOT NULL,
    CONSTRAINT pk_favorites PRIMARY KEY (user_id)
);
CREATE INDEX i_favorites_1 ON favorites (tenant_id);
