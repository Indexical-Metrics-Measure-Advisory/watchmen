CREATE TABLE documents
(

    document_id         VARCHAR(50) NOT NULL,
    document_name       VARCHAR(255) NOT NULL,
    document_type       VARCHAR(50) NOT NULL,
    document_status     VARCHAR(50) NOT NULL,
    document_content    BYTEA NOT NULL,
    processed           SMALLINT NOT NULL,
    verified            SMALLINT NOT NULL,
    tenant_id           VARCHAR(50) NOT NULL,
    created_at          TIMESTAMP    NOT NULL,
    created_by          VARCHAR(50) NOT NULL,
    last_modified_at    TIMESTAMP    NOT NULL,
    last_modified_by    VARCHAR(50) NOT NULL,
    version             INTEGER,
    CONSTRAINT pk_documents PRIMARY KEY (document_id)
);
CREATE INDEX i_documents_1 ON documents (tenant_id);
CREATE INDEX i_documents_2 ON documents (created_at);
CREATE INDEX i_documents_3 ON documents (created_by);
CREATE INDEX i_documents_4 ON documents (last_modified_at);
CREATE INDEX i_documents_5 ON documents (last_modified_by);