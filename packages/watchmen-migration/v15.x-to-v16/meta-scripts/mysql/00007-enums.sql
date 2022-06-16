-- noinspection SqlResolveForFile
RENAME TABLE enums TO enums_1;
RENAME TABLE enums_1 TO enums;
ALTER TABLE enums
    CHANGE enumid enum_id VARCHAR(50) NOT NULL;
ALTER TABLE enums
    MODIFY description VARCHAR(1024) NULL;
ALTER TABLE enums
    CHANGE parentenumid parent_enum_id VARCHAR(50) NULL;
ALTER TABLE enums
    CHANGE tenantid tenant_id VARCHAR(50) NOT NULL;
ALTER TABLE enums
    DROP createtime;
ALTER TABLE enums
    DROP lastmodified;
ALTER TABLE enums
    ADD created_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE enums
    ADD created_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE enums
    ADD last_modified_at DATETIME DEFAULT NOW() NOT NULL;
ALTER TABLE enums
    ADD last_modified_by VARCHAR(50) DEFAULT '-1' NOT NULL;
ALTER TABLE enums
    ADD version BIGINT NULL;
CREATE INDEX created_at ON enums (created_at);
CREATE INDEX created_by ON enums (created_by);
CREATE INDEX last_modified_at ON enums (last_modified_at);
CREATE INDEX last_modified_by ON enums (last_modified_by);
CREATE INDEX name ON enums (name);
CREATE INDEX tenant_id ON enums (tenant_id);
CREATE TABLE enum_items
(
    item_id      VARCHAR(50) NOT NULL,
    code         VARCHAR(50) NOT NULL,
    label        VARCHAR(255),
    parent_code  VARCHAR(50),
    replace_code VARCHAR(50),
    enum_id      VARCHAR(50),
    tenant_id    VARCHAR(50) NOT NULL,
    PRIMARY KEY (item_id),
    INDEX (code),
    INDEX (enum_id),
    INDEX (tenant_id)
);
DROP PROCEDURE IF EXISTS WATCHMEN_MIGRATION_COPY_ENUM_ITEMS;
DELIMITER |
CREATE PROCEDURE WATCHMEN_MIGRATION_COPY_ENUM_ITEMS()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_enum_id VARCHAR(50);
    DECLARE v_tenant_id VARCHAR(50);
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
        SET enum_items_count := JSON_LENGTH(v_items);

        WHILE enum_index < enum_items_count
            DO
                SET current_item := JSON_EXTRACT(v_items, CONCAT('$[', enum_index, ']'));
                SELECT REPLACE(current_item, '\\', '') into current_item;
                SELECT REPLACE(current_item, '"{', '{') into current_item;
                SELECT REPLACE(current_item, '}"', '}') into current_item;

                SELECT IFNULL(MAX(CAST(item_id AS DECIMAL)), 0) + 1 INTO next_item_id FROM enum_items;
                SET @code = REPLACE(TRIM(BOTH '"' FROM IFNULL(JSON_EXTRACT(current_item, '$.code'), '')), '\'', '\'\'');
                SET @label =
                        REPLACE(TRIM(BOTH '"' FROM IFNULL(JSON_EXTRACT(current_item, '$.label'), '')), '\'', '\'\'');
                SET @parent_code =
                        REPLACE(TRIM(BOTH '"' FROM IFNULL(JSON_EXTRACT(current_item, '$.parentCode'), '')), '\'',
                                '\'\'');
                SET @replace_code =
                        REPLACE(TRIM(BOTH '"' FROM IFNULL(JSON_EXTRACT(current_item, '$.replaceCode'), '')), '\'',
                                '\'\'');

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
-- noinspection SqlWithoutWhere
UPDATE enums
SET created_at       = NOW(),
    created_by       = '-1',
    last_modified_at = NOW(),
    last_modified_by = '-1',
    version          = 1;
ALTER TABLE enums
    DROP items;
