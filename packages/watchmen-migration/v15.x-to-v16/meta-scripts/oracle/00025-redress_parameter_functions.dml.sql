CREATE OR REPLACE FUNCTION WATCHMEN_MIGRATION_REDRESS_CONSTANT_FUNCTIONS(a_json CLOB) RETURN STRING IS
    func_body       VARCHAR2(200) DEFAULT '\s*\(\s*(\w+)\s*,\s*(\w+)\s*\)';
    first_not_date  VARCHAR2(200) DEFAULT '\(([^\)0-9])([^\)]+),([^\)]+)\)';
    second_not_date VARCHAR2(200) DEFAULT '\(([^\)]+),([^\)0-9])([^\)]+)\)';
    data            CLOB DEFAULT NULL;
BEGIN
    IF a_json IS NULL THEN
        RETURN a_json;
    END IF;

    data := REPLACE(a_json, '{snowflake}', '{&nextSeq}');
    data := REGEXP_REPLACE(data, concat('yearDiff', func_body), 'yearDiff(\2,\1)', 1, 0, 'm');
    data := REGEXP_REPLACE(data, concat('yearDiff', first_not_date), 'yearDiff(&\1\2,\3)', 1, 0, 'm');
    data := REGEXP_REPLACE(data, concat('yearDiff', second_not_date), 'yearDiff(\1,&\2\3)', 1, 0, 'm');
    data := REGEXP_REPLACE(data, concat('monthDiff', func_body), 'monthDiff(\2,\1)', 1, 0, 'm');
    data := REGEXP_REPLACE(data, concat('monthDiff', first_not_date), 'monthDiff(&\1\2,\3)', 1, 0, 'm');
    data := REGEXP_REPLACE(data, concat('monthDiff', second_not_date), 'monthDiff(\1,&\2\3)', 1, 0, 'm');
    data := REGEXP_REPLACE(data, concat('dayDiff', func_body), 'dayDiff(\2,\1)', 1, 0, 'm');
    data := REGEXP_REPLACE(data, concat('dayDiff', first_not_date), 'dayDiff(&\1\2,\3)', 1, 0, 'm');
    data := REGEXP_REPLACE(data, concat('dayDiff', second_not_date), 'dayDiff(\1,&\2\3)', 1, 0, 'm');

    return data;
END;
UPDATE spaces
SET filters = WATCHMEN_MIGRATION_REDRESS_CONSTANT_FUNCTIONS(filters)
where filters IS NOT NULL;
UPDATE subjects
SET dataset = WATCHMEN_MIGRATION_REDRESS_CONSTANT_FUNCTIONS(dataset)
where dataset IS NOT NULL;
UPDATE reports
SET filters = WATCHMEN_MIGRATION_REDRESS_CONSTANT_FUNCTIONS(filters)
where filters IS NOT NULL;
UPDATE pipelines
SET stages = WATCHMEN_MIGRATION_REDRESS_CONSTANT_FUNCTIONS(stages)
where stages IS NOT NULL;
-- noinspection SqlResolve @ column/"prerequisite_on"
UPDATE pipelines
SET prerequisite_on = WATCHMEN_MIGRATION_REDRESS_CONSTANT_FUNCTIONS(prerequisite_on)
where prerequisite_on IS NOT NULL;
DROP FUNCTION WATCHMEN_MIGRATION_REDRESS_CONSTANT_FUNCTIONS;