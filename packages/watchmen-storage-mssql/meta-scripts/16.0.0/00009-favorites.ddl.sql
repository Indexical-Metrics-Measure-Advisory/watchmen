CREATE TABLE favorites
(
    connected_space_ids NVARCHAR(2048),
    dashboard_ids       NVARCHAR(2048),
    tenant_id           NVARCHAR(50) NOT NULL,
    user_id             NVARCHAR(50) NOT NULL,
    last_visit_time     DATETIME     NOT NULL,
    CONSTRAINT pk_favorites PRIMARY KEY (user_id)
);
CREATE INDEX i_favorites_1 ON favorites (tenant_id);
