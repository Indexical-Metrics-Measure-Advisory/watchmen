CREATE OR REPLACE PROCEDURE DROP_INDEXES_ON_TOPIC_CHANGED(topic_name IN VARCHAR(128)) AS
$$
DECLARE
    record_index RECORD;
    cursor_indexes CURSOR (topic_name VARCHAR(128))
        FOR SELECT n.nspname              AS schemaname,
                   c.relname              AS tablename,
                   i.relname              AS indexname,
                   x.indisprimary         as pk,
                   pg_get_indexdef(i.oid) AS indexdef
            FROM pg_index x
                     JOIN pg_class c ON c.oid = x.indrelid
                     JOIN pg_class i ON i.oid = x.indexrelid
                     LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE (c.relkind = ANY (ARRAY ['r'::"char", 'm'::"char", 'p'::"char"]))
              AND (i.relkind = ANY (ARRAY ['i'::"char", 'I'::"char"]))
              AND x.indisprimary = false
              and c.relname = topic_name;
BEGIN
    OPEN cursor_indexes(topic_name);

    LOOP
        FETCH cursor_indexes INTO record_index;
        EXIT WHEN NOT FOUND;
        EXECUTE CONCAT('DROP INDEX ', record_index.indexname);
    END LOOP;

    CLOSE cursor_indexes;
END;
$$ LANGUAGE PLPGSQL;
