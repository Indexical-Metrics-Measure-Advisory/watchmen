CREATE TABLE change_data_record
(
    change_record_id        DECIMAL(20)      NOT NULL,
    model_name              NVARCHAR(50)     NOT NULL,
    table_name              NVARCHAR(50)     NOT NULL,
    data_id                 NVARCHAR(MAX)    NOT NULL,
    root_table_name         NVARCHAR(50),
    root_data_id            NVARCHAR(MAX),
    is_merged               TINYINT          NOT NULL,
    result                  NVARCHAR(MAX),
    table_trigger_id        DECIMAL(20)      NOT NULL,
    model_trigger_id        DECIMAL(20)      NOT NULL,
    event_trigger_id        DECIMAL(20)      NOT NULL,
    tenant_id               NVARCHAR(50)     NOT NULL,
    created_at              DATETIME         NOT NULL,
    created_by              NVARCHAR(50)     NOT NULL,
    last_modified_at        DATETIME         NOT NULL,
    last_modified_by        NVARCHAR(50)     NOT NULL,
    CONSTRAINT pk_change_data_record PRIMARY KEY (change_record_id)
);
CREATE INDEX i_change_data_record_1 ON change_data_record (tenant_id);
CREATE INDEX i_change_data_record_2 ON change_data_record (created_at);
CREATE INDEX i_change_data_record_3 ON change_data_record (created_by);
CREATE INDEX i_change_data_record_4 ON change_data_record (last_modified_at);
CREATE INDEX i_change_data_record_5 ON change_data_record (last_modified_by);
CREATE INDEX i_change_data_record_6 ON change_data_record (table_trigger_id);
CREATE INDEX i_change_data_record_7 ON change_data_record (model_trigger_id);
CREATE INDEX i_change_data_record_8 ON change_data_record (event_trigger_id);