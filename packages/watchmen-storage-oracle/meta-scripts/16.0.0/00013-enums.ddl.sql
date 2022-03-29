CREATE TABLE enums
(
    enum_id          VARCHAR2(50) NOT NULL,
    name             VARCHAR2(50) NOT NULL,
    description      VARCHAR2(1024),
    parent_enum_id   VARCHAR2(50),
    tenant_id        VARCHAR2(50) NOT NULL,
    created_at       DATE         NOT NULL,
    created_by       VARCHAR2(50) NOT NULL,
    last_modified_at DATE         NOT NULL,
    last_modified_by VARCHAR2(50) NOT NULL,
    version          NUMBER(20),
    CONSTRAINT pk_enums PRIMARY KEY (enum_id)
);
CREATE INDEX i_enums_1 ON enums (name);
CREATE INDEX i_enums_2 ON enums (tenant_id);
CREATE INDEX i_enums_3 ON enums (created_at);
CREATE INDEX i_enums_4 ON enums (created_by);
CREATE INDEX i_enums_5 ON enums (last_modified_at);
CREATE INDEX i_enums_6 ON enums (last_modified_by);
