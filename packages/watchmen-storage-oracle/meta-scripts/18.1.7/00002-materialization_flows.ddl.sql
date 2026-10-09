CREATE TABLE materialization_flows
(
    id                  VARCHAR2(50) NOT NULL,
    name                VARCHAR2(200),
    materialization_ids CLOB,
    frequency           VARCHAR2(20),
    time                VARCHAR2(10),
    "date"              VARCHAR2(20),
    weekday             VARCHAR2(10),
    day_of_month        NUMBER(10),
    schedule_enabled    NUMBER(1)    NOT NULL,
    enabled             NUMBER(1)    NOT NULL,
    description         VARCHAR2(1024),
    tenant_id           VARCHAR2(50) NOT NULL,
    created_at          DATE         NOT NULL,
    created_by          VARCHAR2(50) NOT NULL,
    last_modified_at    DATE         NOT NULL,
    last_modified_by    VARCHAR2(50) NOT NULL,
    user_id             VARCHAR2(50) NOT NULL,
    CONSTRAINT pk_materialization_flows PRIMARY KEY (id)
);
CREATE INDEX i_materialization_flows_1 ON materialization_flows (tenant_id);
CREATE INDEX i_materialization_flows_2 ON materialization_flows (user_id);
