CREATE TABLE materialization_flows
(
    id                  VARCHAR(50) NOT NULL,
    name                VARCHAR(200),
    materialization_ids JSONB,
    frequency           VARCHAR(20),
    time                VARCHAR(10),
    date                VARCHAR(20),
    weekday             VARCHAR(10),
    day_of_month        INTEGER,
    schedule_enabled    SMALLINT    NOT NULL,
    enabled             SMALLINT    NOT NULL,
    description         VARCHAR(1024),
    tenant_id           VARCHAR(50) NOT NULL,
    created_at          TIMESTAMP   NOT NULL,
    created_by          VARCHAR(50) NOT NULL,
    last_modified_at    TIMESTAMP   NOT NULL,
    last_modified_by    VARCHAR(50) NOT NULL,
    user_id             VARCHAR(50) NOT NULL,
    CONSTRAINT pk_materialization_flows PRIMARY KEY (id)
);
CREATE INDEX i_materialization_flows_1 ON materialization_flows (tenant_id);
CREATE INDEX i_materialization_flows_2 ON materialization_flows (user_id);
