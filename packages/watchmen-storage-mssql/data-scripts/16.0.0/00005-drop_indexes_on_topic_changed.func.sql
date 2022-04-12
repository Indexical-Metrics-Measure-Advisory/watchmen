-- noinspection SqlSignatureForFile @ routine/"SP_EXECUTESQL"
CREATE OR ALTER PROCEDURE DROP_INDEXES_ON_TOPIC_CHANGED(@topic_name NVARCHAR(128))
AS
BEGIN
    DECLARE @qry NVARCHAR(MAX);
    SELECT @qry =
           (SELECT 'DROP INDEX ' + QUOTENAME(IX.NAME) + ' ON ' + QUOTENAME(OBJECT_SCHEMA_NAME(IX.OBJECT_ID)) + '.' +
                   QUOTENAME(OBJECT_NAME(IX.OBJECT_ID)) + ';'
            FROM SYS.INDEXES IX
            WHERE IX.NAME IS NOT NULL
              AND IX.TYPE != 1
              AND UPPER(OBJECT_NAME(IX.OBJECT_ID)) = UPPER(@topic_name)
            FOR XML PATH(''));
    EXEC SP_EXECUTESQL @qry;
END;
GO
