CREATE TABLE change_data_record
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
    CONSTRAINT pk_change_data_record PRIMARY KEY (change_record_id)
);
CREATE INDEX i_change_data_record_1 ON change_data_record (tenant_id);
CREATE INDEX i_change_data_record_2 ON change_data_record (created_at);
CREATE INDEX i_change_data_record_3 ON change_data_record (created_by);
CREATE INDEX i_change_data_record_4 ON change_data_record (last_modified_at);
CREATE INDEX i_change_data_record_5 ON change_data_record (last_modified_by);
CREATE INDEX i_change_data_record_6 ON change_data_record (table_trigger_id);
CREATE INDEX i_change_data_record_7 ON change_data_record (model_trigger_id);
CREATE INDEX i_change_data_record_8 ON change_data_record (module_trigger_id);
CREATE INDEX i_change_data_record_9 ON change_data_record (event_trigger_id);
CREATE INDEX i_change_data_record_status_event_trigger_id ON change_data_record (status, event_trigger_id);
