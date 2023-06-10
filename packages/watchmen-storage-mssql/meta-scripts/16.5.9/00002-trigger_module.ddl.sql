CREATE TABLE trigger_module
(
    module_trigger_id   DECIMAL(20)       NOT NULL,
    module_name         NVARCHAR(50)      NOT NULL,
    is_finished         TINYINT           NOT NULL,
    priority            DECIMAL(20)       NOT NULL,
    event_trigger_id    DECIMAL(20)       NOT NULL,
    tenant_id           NVARCHAR(50)      NOT NULL,
    created_at          DATETIME          NOT NULL,
    created_by          NVARCHAR(50)      NOT NULL,
    last_modified_at    DATETIME          NOT NULL,
    last_modified_by    NVARCHAR(50)      NOT NULL,
    CONSTRAINT pk_trigger_module PRIMARY KEY (module_trigger_id)
);
CREATE INDEX i_trigger_module_1 ON trigger_module (tenant_id);
CREATE INDEX i_trigger_module_2 ON trigger_module (created_at);
CREATE INDEX i_trigger_module_3 ON trigger_module (created_by);
CREATE INDEX i_trigger_module_4 ON trigger_module (last_modified_at);
CREATE INDEX i_trigger_module_5 ON trigger_module (last_modified_by);