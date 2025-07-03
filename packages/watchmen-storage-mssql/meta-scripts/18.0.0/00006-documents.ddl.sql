CREATE TABLE documents
(
    document_id        NVARCHAR(50) NOT NULL,
    document_name      NVARCHAR(255) NOT NULL,
    document_type      NVARCHAR(50) NOT NULL,
    document_status    NVARCHAR(50) NOT NULL,
    document_content   BLOB NOT NULL,
    processed          TINYINT(1) NOT NULL,
    verified           TINYINT(1) NOT NULL,
    tenant_id          NVARCHAR(50) NOT NULL,
    created_at         DATETIME    NOT NULL,
    created_by         NVARCHAR(50) NOT NULL,
    last_modified_at   DATETIME    NOT NULL,
    last_modified_by   NVARCHAR(50) NOT NULL,
    version            INTEGER,
    CONSTRAINT pk_documents PRIMARY KEY (document_id)
);
CREATE INDEX i_documents_1 ON documents (tenant_id);
CREATE INDEX i_documents_2 ON documents (created_at);
CREATE INDEX i_documents_3 ON documents (created_by);
CREATE INDEX i_documents_4 ON documents (last_modified_at);
CREATE INDEX i_documents_5 ON documents (last_modified_by);