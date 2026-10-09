CREATE TABLE materialization_flows
(
    id                  NVARCHAR(50) NOT NULL,
    name                NVARCHAR(200),
    materialization_ids NVARCHAR(MAX),
    frequency           NVARCHAR(20),
    time                NVARCHAR(10),
    [date]              NVARCHAR(20),
    weekday             NVARCHAR(10),
    day_of_month        INT,
    schedule_enabled    SMALLINT     NOT NULL,
    enabled             SMALLINT     NOT NULL,
    description         NVARCHAR(1024),
    tenant_id           NVARCHAR(50) NOT NULL,
    created_at          DATETIME     NOT NULL,
    created_by          NVARCHAR(50) NOT NULL,
    last_modified_at    DATETIME     NOT NULL,
    last_modified_by    NVARCHAR(50) NOT NULL,
    user_id             NVARCHAR(50) NOT NULL,
    CONSTRAINT pk_materialization_flows PRIMARY KEY (id)
);
CREATE INDEX i_materialization_flows_1 ON materialization_flows (tenant_id);
CREATE INDEX i_materialization_flows_2 ON materialization_flows (user_id);
