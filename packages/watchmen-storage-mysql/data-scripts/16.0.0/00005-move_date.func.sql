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
    DECLARE hour int DEFAULT HOUR(a_date);
    DECLARE minute int DEFAULT MINUTE(a_date);
    DECLARE second int DEFAULT SECOND(a_date);

    DECLARE value INT DEFAULT 0;
    DECLARE movement_value INT DEFAULT 0;

    IF location != '' AND movement != '' THEN
        SET value = CAST(movement AS SIGNED INTEGER);

        IF location = 'Y' THEN
            IF command = '' THEN
                -- set directly
                SET year = value;
            ELSEIF command = '+' THEN
                -- add year
                SET year = year + value;
            ELSEIF command = '-' THEN
                -- subtract year
                SET year = year - value;
            ELSE
                SET @msg = CONCAT('Date movement command[', command, '] is not supported.');
                SIGNAL SQLSTATE 'HY000' SET MESSAGE_TEXT = @msg;
            END IF;
        ELSEIF location = 'M' THEN
            IF command = '' THEN
                -- check month
                IF value < 1 OR value > 12 THEN
                    SIGNAL SQLSTATE 'HY000' SET MESSAGE_TEXT =
                            'Month must be between 1 and 12 when do set directly on date movement.';
                ELSE
                    -- simply set month to given value
                    SET month = value;
                END IF;
            ELSEIF command = '+' THEN
                SET movement_value = VALUE % 12;
                IF month + movement_value > 12 THEN
                    SET year = year + FLOOR(month / 12) + 1;
                    SET month = month + movement_value - 12;
                ELSE
                    SET year = year + FLOOR(month / 12);
                    SET month = month + movement_value;
                END IF;
            ELSEIF command = '-' THEN
                SET movement_value = VALUE % 12;
                IF month - movement_value < 1 THEN
                    SET year = year - FLOOR(month / 12) - 1;
                    SET month = month - movement_value + 12;
                ELSE
                    SET year = year - FLOOR(month / 12);
                    SET month = month - movement_value;
                END IF;
            ELSE
                SET @msg = CONCAT('Date movement command[', command, '] is not supported.');
                SIGNAL SQLSTATE 'HY000' SET MESSAGE_TEXT = @msg;
            END IF;
        ELSEIF location = 'D' THEN
            IF value = 99 THEN
                IF month = 1 OR month = 3 OR month = 5 OR month = 7 OR month = 8 OR month = 10 OR month = 12 THEN
                    SET day_of_month = 31;
                ELSEIF month = 4 OR month = 6 OR month = 9 OR month = 11 THEN
                    SET day_of_month = 30;
                ELSE
                    SET day_of_month = 29;
                END IF;
            ELSEIF command = '' THEN
                IF value < 1 THEN
                    SIGNAL SQLSTATE 'HY000' SET MESSAGE_TEXT =
                            'Day of month must be started from 1 when do set directly on date movement.';
                END IF;
                IF month = 1 OR month = 3 OR month = 5 OR month = 7 OR month = 8 OR month = 10 OR month = 12 THEN
                    IF value > 31 THEN
                        SIGNAL SQLSTATE 'HY000' SET MESSAGE_TEXT =
                                'Day of month must be ended by 31 when do set directly on date movement for Jan, Mar, May, Jul, Aug, Oct and Dec.';
                    ELSE
                        SET day_of_month = 31;
                    END IF;
                ELSEIF month = 4 OR month = 6 OR month = 9 OR month = 11 THEN
                    IF value > 30 THEN
                        SIGNAL SQLSTATE 'HY000' SET MESSAGE_TEXT =
                                'Day of month must be ended by 30 when do set directly on date movement for Apr, Jun, Sep and Nov.';
                    ELSE
                        SET day_of_month = 30;
                    END IF;
                ELSE
                    IF value > 29 THEN
                        SIGNAL SQLSTATE 'HY000' SET MESSAGE_TEXT =
                                'Day of month must be ended by 29 when do set directly on date movement for Feb.';
                    ELSE
                        SET day_of_month = 29;
                    END IF;
                END IF;
                SET day_of_month = value;
            ELSEIF command = '+' THEN
                RETURN DATE_ADD(a_date, INTERVAL value DAY);
            ELSEIF command = '-' THEN
                RETURN DATE_SUB(a_date, INTERVAL value DAY);
            ELSE
                SET @msg = CONCAT('Date movement command[', command, '] is not supported.');
                SIGNAL SQLSTATE 'HY000' SET MESSAGE_TEXT = @msg;
            END IF;
        ELSEIF location = 'h' THEN
            IF command = '' THEN
                IF value < 0 OR VALUE >= 60 THEN
                    SIGNAL SQLSTATE 'HY000' SET MESSAGE_TEXT = 'Hour must be between 0 and 59 when do set directly.';
                ELSE
                    SET hour = value;
                END IF;
            ELSEIF command = '+' THEN
                RETURN DATE_ADD(a_date, INTERVAL value DAY_HOUR);
            ELSEIF command = '-' THEN
                RETURN DATE_SUB(a_date, INTERVAL value DAY_HOUR);
            ELSE
                SET @msg = CONCAT('Date movement command[', command, '] is not supported.');
                SIGNAL SQLSTATE 'HY000' SET MESSAGE_TEXT = @msg;
            END IF;
        ELSEIF location = 'm' THEN
            IF command = '' THEN
                IF value < 0 OR VALUE >= 60 THEN
                    SIGNAL SQLSTATE 'HY000' SET MESSAGE_TEXT = 'Minute must be between 0 and 59 when do set directly.';
                ELSE
                    SET minute = value;
                END IF;
            ELSEIF command = '+' THEN
                RETURN DATE_ADD(a_date, INTERVAL value DAY_MINUTE);
            ELSEIF command = '-' THEN
                RETURN DATE_SUB(a_date, INTERVAL value DAY_MINUTE);
            ELSE
                SET @msg = CONCAT('Date movement command[', command, '] is not supported.');
                SIGNAL SQLSTATE 'HY000' SET MESSAGE_TEXT = @msg;
            END IF;
        ELSEIF location = 's' THEN
            IF command = '' THEN
                IF value < 0 OR VALUE >= 60 THEN
                    SIGNAL SQLSTATE 'HY000' SET MESSAGE_TEXT = 'Second must be between 0 and 59 when do set directly.';
                ELSE
                    SET minute = value;
                END IF;
            ELSEIF command = '+' THEN
                RETURN DATE_ADD(a_date, INTERVAL value DAY_SECOND);
            ELSEIF command = '-' THEN
                RETURN DATE_SUB(a_date, INTERVAL value DAY_SECOND);
            ELSE
                SET @msg = CONCAT('Date movement command[', command, '] is not supported.');
                SIGNAL SQLSTATE 'HY000' SET MESSAGE_TEXT = @msg;
            END IF;
        END IF;
    END IF;

    IF month = 2 and day_of_month >= 29 THEN
        -- set to 02/29, check leap year
        SET last_day_of_month = DAY(LAST_DAY(STR_TO_DATE(DATE_FORMAT(a_date, '%Y-02-%d'), '%Y-%m-%d')));
        IF last_day_of_month = 28 THEN
            -- last day of feb is 28, set day of month to 28
            SET day_of_month = 28;
        END IF;
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
