DROP FUNCTION IF EXISTS WATCHMEN_MIGRATION_REDRESS_CONSTANT_FUNCTIONS;
DELIMITER |
CREATE FUNCTION WATCHMEN_MIGRATION_REDRESS_CONSTANT_FUNCTIONS(a_json JSON)
    RETURNS JSON
    NO SQL
BEGIN
    DECLARE func_body VARCHAR(200) DEFAULT '[[:blank:]]*\\([[:blank:]]*([^\)[[:blank:]]]+)[[:blank:]]*,[[:blank:]]*([^\)[[:blank:]]]+)[[:blank:]]*\\)';
    DECLARE first_not_date VARCHAR(200) DEFAULT '\\(([^\)[[:digit:]]])([^\)]+),([^\)]+)\\)';
    DECLARE second_not_date VARCHAR(200) DEFAULT '\\(([^\)]+),([^\)[[:digit:]]])([^\)]+)\\)';

    IF a_json IS NULL THEN
        RETURN a_json;
    END IF;

    SET @data = REPLACE(a_json, '{snowflake}', '{&nextSeq}');
    SET @data = REGEXP_REPLACE(@data, concat('yearDiff', func_body), 'yearDiff($2,$1)', 1, 0, 'm');
    SET @data = REGEXP_REPLACE(@data, concat('yearDiff', first_not_date), 'yearDiff(&$1$2,$3)', 1, 0, 'm');
    SET @data = REGEXP_REPLACE(@data, concat('yearDiff', second_not_date), 'yearDiff($1,&$2$3)', 1, 0, 'm');
    SET @data = REGEXP_REPLACE(@data, concat('monthDiff', func_body), 'monthDiff($2,$1)', 1, 0, 'm');
    SET @data = REGEXP_REPLACE(@data, concat('monthDiff', first_not_date), 'monthDiff(&$1$2,$3)', 1, 0, 'm');
    SET @data = REGEXP_REPLACE(@data, concat('monthDiff', second_not_date), 'monthDiff($1,&$2$3)', 1, 0, 'm');
    SET @data = REGEXP_REPLACE(@data, concat('dayDiff', func_body), 'dayDiff($2,$1)', 1, 0, 'm');
    SET @data = REGEXP_REPLACE(@data, concat('dayDiff', first_not_date), 'dayDiff(&$1$2,$3)', 1, 0, 'm');
    SET @data = REGEXP_REPLACE(@data, concat('dayDiff', second_not_date), 'dayDiff($1,&$2$3)', 1, 0, 'm');

    return @data;
END|
DELIMITER ;

UPDATE spaces
SET filters = WATCHMEN_MIGRATION_REDRESS_CONSTANT_FUNCTIONS(filters)
where filters IS NOT NULL
  and filters != '';
UPDATE subjects
SET dataset = WATCHMEN_MIGRATION_REDRESS_CONSTANT_FUNCTIONS(dataset)
where dataset IS NOT NULL
  and dataset != '';
UPDATE reports
SET filters = WATCHMEN_MIGRATION_REDRESS_CONSTANT_FUNCTIONS(filters)
where filters IS NOT NULL
  and filters != '';
UPDATE pipelines
SET stages = WATCHMEN_MIGRATION_REDRESS_CONSTANT_FUNCTIONS(stages)
where stages IS NOT NULL
  and stages != '';
UPDATE pipelines
SET prerequisite_on = WATCHMEN_MIGRATION_REDRESS_CONSTANT_FUNCTIONS(prerequisite_on)
where prerequisite_on IS NOT NULL
  and prerequisite_on != '';

DROP FUNCTION IF EXISTS WATCHMEN_MIGRATION_REDRESS_CONSTANT_FUNCTIONS;
