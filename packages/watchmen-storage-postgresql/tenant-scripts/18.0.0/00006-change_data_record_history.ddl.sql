CREATE TABLE change_data_record_history
(
    change_record_id        BIGINT           NOT NULL,
    model_name              VARCHAR(50)      NOT NULL,
    table_name              VARCHAR(50)      NOT NULL,
    data_id                 JSON             NOT NULL,
    root_table_name         VARCHAR(50),
    root_data_id            JSON,
    is_merged               SMALLINT         NOT NULL,
    status                  SMALLINT         NOT NULL,
    result                  JSON,
    table_trigger_id        BIGINT           NOT NULL,
    model_trigger_id        BIGINT           NOT NULL,
    module_trigger_id       BIGINT           NOT NULL,
    event_trigger_id        BIGINT           NOT NULL,
    tenant_id               VARCHAR(50)      NOT NULL,
    created_at              TIMESTAMP        NOT NULL,
    created_by              VARCHAR(50)      NOT NULL,
    last_modified_at        TIMESTAMP        NOT NULL,
    last_modified_by        VARCHAR(50)      NOT NULL,
    CONSTRAINT pk_change_data_record_history PRIMARY KEY (change_record_id)
);
CREATE INDEX i_change_data_record_history_1 ON change_data_record_history (tenant_id);
CREATE INDEX i_change_data_record_history_2 ON change_data_record_history (created_at);
CREATE INDEX i_change_data_record_history_3 ON change_data_record_history (created_by);
CREATE INDEX i_change_data_record_history_4 ON change_data_record_history (last_modified_at);
CREATE INDEX i_change_data_record_history_5 ON change_data_record_history (last_modified_by);
CREATE INDEX i_change_data_record_history_6 ON change_data_record_history (table_trigger_id);
CREATE INDEX i_change_data_record_history_7 ON change_data_record_history (model_trigger_id);
CREATE INDEX i_change_data_record_history_8 ON change_data_record_history (module_trigger_id);
CREATE INDEX i_change_data_record_history_9 ON change_data_record_history (event_trigger_id);
