DROP PROCEDURE IF EXISTS WATCHMEN_MIGRATION_COPY_ENUM_ITEMS;
DELIMITER |
CREATE PROCEDURE WATCHMEN_MIGRATION_COPY_ENUM_ITEMS()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_enum_id VARCHAR2(50);
    DECLARE v_tenant_id VARCHAR2(50);
    DECLARE v_items LONGTEXT DEFAULT NULL;
    DECLARE enum_index INT UNSIGNED DEFAULT 0;
    DECLARE enum_items_count INT UNSIGNED DEFAULT 0;
    DECLARE current_item LONGTEXT DEFAULT NULL;
    DECLARE next_item_id INT DEFAULT 0;
    DECLARE cur_list CURSOR FOR SELECT enum_id, tenant_id, items FROM enums WHERE items IS NOT NULL AND items != '';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur_list;
    read_loop :
    LOOP
        FETCH cur_list INTO v_enum_id, v_tenant_id, v_items;
        IF done THEN
            LEAVE read_loop;
        END IF;

        SET enum_index := 0;
        SET enum_items_count := CLOB_LENGTH(v_items);

        WHILE enum_index < enum_items_count
            DO
                SET current_item := CLOB_EXTRACT(v_items, CONCAT('$[', enum_index, ']'));
                SELECT REPLACE(current_item, '\\', '') into current_item;
                SELECT REPLACE(current_item, '"{', '{') into current_item;
                SELECT REPLACE(current_item, '}"', '}') into current_item;

                SELECT IFNULL(MAX(item_id), 0) + 1 INTO next_item_id FROM enum_items;
                SET @code = TRIM(BOTH '"' FROM IFNULL(CLOB_EXTRACT(current_item, '$.code'), ''));
                SET @label = TRIM(BOTH '"' FROM IFNULL(CLOB_EXTRACT(current_item, '$.label'), ''));
                SET @parent_code = TRIM(BOTH '"' FROM IFNULL(CLOB_EXTRACT(current_item, '$.parentCode'), ''));
                SET @replace_code = TRIM(BOTH '"' FROM IFNULL(CLOB_EXTRACT(current_item, '$.replaceCode'), ''));

                SET @sql_insert = CONCAT(
                        'INSERT INTO enum_items(item_id, code, label, parent_code, replace_code, enum_id, tenant_id) VALUES (\'',
                        next_item_id, '\', \'', @code, '\', \'', @label, '\', \'', @parent_code, '\', \'',
                        @replace_code, '\', \'', v_enum_id, '\', \'', v_tenant_id, '\')');
                PREPARE a_sql FROM @sql_insert;
                EXECUTE a_sql;
                COMMIT;
                SET enum_index := enum_index + 1;
            END WHILE;
    END LOOP read_loop;
    CLOSE cur_list;
END|
DELIMITER ;
CALL WATCHMEN_MIGRATION_COPY_ENUM_ITEMS();
DROP PROCEDURE IF EXISTS WATCHMEN_MIGRATION_COPY_ENUM_ITEMS;
UPDATE enums SET created_at = SYSDATE, created_by = '-1', last_modified_at = SYSDATE, last_modified_by = '-1', version = 1;
