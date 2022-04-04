CREATE TABLE enums
(
    enum_id          NVARCHAR(50) NOT NULL,
    name             NVARCHAR(50) NOT NULL,
    description      NVARCHAR(1024),
    parent_enum_id   NVARCHAR(50),
    tenant_id        NVARCHAR(50) NOT NULL,
    created_at       DATETIME     NOT NULL,
    created_by       NVARCHAR(50) NOT NULL,
    last_modified_at DATETIME     NOT NULL,
    last_modified_by NVARCHAR(50) NOT NULL,
    version          DECIMAL(20),
    CONSTRAINT pk_enums PRIMARY KEY (enum_id)
);
CREATE INDEX i_enums_1 ON enums (name);
CREATE INDEX i_enums_2 ON enums (tenant_id);
CREATE INDEX i_enums_3 ON enums (created_at);
CREATE INDEX i_enums_4 ON enums (created_by);
CREATE INDEX i_enums_5 ON enums (last_modified_at);
CREATE INDEX i_enums_6 ON enums (last_modified_by);
