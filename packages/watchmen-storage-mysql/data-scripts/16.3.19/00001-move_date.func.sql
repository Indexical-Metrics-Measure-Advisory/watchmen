# https://dev.mysql.com/doc/refman/5.7/en/stored-programs-logging.html
# set global log_bin_trust_function_creators=1;
DROP FUNCTION IF EXISTS MOVEDATE;
DROP FUNCTION IF EXISTS MOVEDATE2;

DELIMITER |
CREATE FUNCTION MOVEDATE2(a_date DATETIME, location VARCHAR(1), command VARCHAR(1), movement VARCHAR(100))
    RETURNS DATETIME
    DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE year INT DEFAULT YEAR(a_date);
    DECLARE month INT DEFAULT MONTH(a_date);
    DECLARE day_of_month INT DEFAULT DAY(a_date);
    DECLARE last_day_of_month INT DEFAULT DAY(LAST_DAY(a_date));
    DECLARE hour INT DEFAULT HOUR(a_date);
    DECLARE minute INT DEFAULT MINUTE(a_date);
    DECLARE second INT DEFAULT SECOND(a_date);

    DECLARE value INT DEFAULT 0;

    IF location != '' AND movement != '' THEN
        SET value = CAST(movement AS SIGNED INTEGER);

        IF BINARY location = 'Y' THEN
            IF command = '' THEN
                -- set directly
                SET year = value;
            ELSEIF command = '+' THEN
                -- add year
                RETURN DATE_ADD(a_date, INTERVAL value YEAR);
            ELSEIF command = '-' THEN
                -- subtract year
                RETURN DATE_SUB(a_date, INTERVAL value YEAR);
            ELSE
                RETURN a_date;
            END IF;
        ELSEIF BINARY location = 'M' THEN
            IF command = '' THEN
                SET month = IF(value < 1, 1, IF(value > 12, 12, value));
            ELSEIF command = '+' THEN
                RETURN DATE_ADD(a_date, INTERVAL value MONTH);
            ELSEIF command = '-' THEN
                RETURN DATE_SUB(a_date, INTERVAL value MONTH);
            ELSE
                RETURN a_date;
            END IF;
        ELSEIF BINARY location = 'D' THEN
            IF value = 99 THEN
                SET day_of_month = 31;
            ELSEIF command = '' THEN
                SET day_of_month = IF(value < 1, 1, value);
            ELSEIF command = '+' THEN
                RETURN DATE_ADD(a_date, INTERVAL value DAY);
            ELSEIF command = '-' THEN
                RETURN DATE_SUB(a_date, INTERVAL value DAY);
            ELSE
                RETURN a_date;
            END IF;
        ELSEIF BINARY location = 'h' THEN
            IF command = '' THEN
                SET hour = IF(value < 0, 0, IF(value > 23, 23, value));
            ELSEIF command = '+' THEN
                RETURN DATE_ADD(a_date, INTERVAL value DAY_HOUR);
            ELSEIF command = '-' THEN
                RETURN DATE_SUB(a_date, INTERVAL value DAY_HOUR);
            ELSE
                RETURN a_date;
            END IF;
        ELSEIF BINARY location = 'm' THEN
            IF command = '' THEN
                SET minute = IF(value < 0, 0, IF(value > 59, 59, value));
            ELSEIF command = '+' THEN
                RETURN DATE_ADD(a_date, INTERVAL value DAY_MINUTE);
            ELSEIF command = '-' THEN
                RETURN DATE_SUB(a_date, INTERVAL value DAY_MINUTE);
            ELSE
                RETURN a_date;
            END IF;
        ELSEIF BINARY location = 's' THEN
            IF command = '' THEN
                SET second = IF(value < 0, 0, IF(value > 59, 59, value));
            ELSEIF command = '+' THEN
                RETURN DATE_ADD(a_date, INTERVAL value DAY_SECOND);
            ELSEIF command = '-' THEN
                RETURN DATE_SUB(a_date, INTERVAL value DAY_SECOND);
            ELSE
                RETURN a_date;
            END IF;
        END IF;
        -- if day of month is greater than last day of month, reset it
        SET last_day_of_month = DAY(LAST_DAY(STR_TO_DATE(
                DATE_FORMAT(a_date, CONCAT('%Y-', IF(month < 10, CONCAT('0', month), month), '-01')), '%Y-%m-%d')));
        IF day_of_month > last_day_of_month THEN
            SET day_of_month = last_day_of_month;
        END IF;

        RETURN STR_TO_DATE(
                CONCAT(
                        year, '-',
                        IF(month < 10, CONCAT('0', month), month), '-',
                        IF(day_of_month < 10, CONCAT('0', day_of_month), day_of_month), ' ',
                        IF(hour < 10, CONCAT('0', hour), hour), ':',
                        IF(minute < 10, CONCAT('0', minute), minute), ':',
                        IF(second < 10, CONCAT('0', second), second)
                    ), '%Y-%m-%d %H:%i:%S');
    ELSE
        RETURN a_date;
    END IF;
END |

CREATE FUNCTION MOVEDATE(a_date DATETIME, pattern VARCHAR(100))
    RETURNS DATETIME
    DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE pattern_length INT DEFAULT LENGTH(pattern);
    DECLARE pattern_char_index INT DEFAULT 0;
    DECLARE pattern_char VARCHAR(1) DEFAULT '';

    DECLARE location VARCHAR(1) DEFAULT '';
    DECLARE command VARCHAR(1) DEFAULT '';
    DECLARE movement VARCHAR(100) DEFAULT '';

    DECLARE computed DATETIME DEFAULT a_date;

    char_loop:
    LOOP
        SET pattern_char_index = pattern_char_index + 1;
        IF pattern_char_index > pattern_length THEN
            IF LOCATE(location, 'YMDhms') != 0 THEN
                SET computed = MOVEDATE2(computed, location, command, movement);
            END IF;
            LEAVE char_loop;
        END IF;

        SET pattern_char = SUBSTR(pattern, pattern_char_index, 1);
        IF LOCATE(pattern_char, 'YMDhms') != 0 THEN
            -- location char
            -- let's say a new movement segment is started now
            SET computed = MOVEDATE2(computed, location, command, movement);
            -- set location to new one, clear command and movement
            SET location = pattern_char;
            SET command = '';
            SET movement = '';
        ELSEIF LOCATE(pattern_char, '+-') != 0 THEN
            -- command char
            SET command = pattern_char;
            SET movement = '';
        ELSE
            -- should be a movement char, movement can be chars
            SET movement = CONCAT(movement, pattern_char);
        END IF;
    END LOOP char_loop;

    RETURN computed;
END |
DELIMITER ;
