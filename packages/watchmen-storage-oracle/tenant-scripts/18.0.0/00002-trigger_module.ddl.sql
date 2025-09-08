CREATE TABLE trigger_module
(
    module_trigger_id   NUMBER(20)    NOT NULL,
    module_name         VARCHAR2(50)  NOT NULL,
    is_finished         NUMBER(1)     NOT NULL,
    priority            NUMBER(5)     NOT NULL,
    event_trigger_id    NUMBER(20)    NOT NULL,
    tenant_id           VARCHAR2(50)  NOT NULL,
    created_at          DATE          NOT NULL,
    created_by          VARCHAR2(50)  NOT NULL,
    last_modified_at    DATE          NOT NULL,
    last_modified_by    VARCHAR2(50)  NOT NULL,
    CONSTRAINT pk_trigger_module PRIMARY KEY (module_trigger_id)
);
CREATE INDEX i_trigger_module_1 ON trigger_module (tenant_id);
CREATE INDEX i_trigger_module_2 ON trigger_module (created_at);
CREATE INDEX i_trigger_module_3 ON trigger_module (created_by);
CREATE INDEX i_trigger_module_4 ON trigger_module (last_modified_at);
CREATE INDEX i_trigger_module_5 ON trigger_module (last_modified_by);
CREATE INDEX i_trigger_module_event_trigger_id ON trigger_module (event_trigger_id);