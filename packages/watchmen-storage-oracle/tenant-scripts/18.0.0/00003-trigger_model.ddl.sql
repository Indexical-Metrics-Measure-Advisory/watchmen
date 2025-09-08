CREATE TABLE trigger_model
(
    model_trigger_id    NUMBER(20)    NOT NULL,
    model_name          VARCHAR2(50)  NOT NULL,
    is_finished         NUMBER(1)     NOT NULL,
    module_trigger_id   NUMBER(20)    NOT NULL,
    event_trigger_id    NUMBER(20)    NOT NULL,
    tenant_id           VARCHAR2(50)  NOT NULL,
    created_at          DATE          NOT NULL,
    created_by          VARCHAR2(50)  NOT NULL,
    last_modified_at    DATE          NOT NULL,
    last_modified_by    VARCHAR2(50)  NOT NULL,
    CONSTRAINT pk_trigger_model PRIMARY KEY (model_trigger_id)
);
CREATE INDEX i_trigger_model_1 ON trigger_model (tenant_id);
CREATE INDEX i_trigger_model_2 ON trigger_model (created_at);
CREATE INDEX i_trigger_model_3 ON trigger_model (created_by);
CREATE INDEX i_trigger_model_4 ON trigger_model (last_modified_at);
CREATE INDEX i_trigger_model_5 ON trigger_model (last_modified_by);
CREATE INDEX i_trigger_model_module_trigger_id ON trigger_model (module_trigger_id);