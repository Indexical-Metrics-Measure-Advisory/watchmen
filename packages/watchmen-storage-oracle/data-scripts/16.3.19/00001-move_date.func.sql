CREATE OR REPLACE FUNCTION MOVEDATE2(a_date IN DATE, location VARCHAR2, command VARCHAR2, movement VARCHAR2)
    RETURN DATE
    IS
    year              INT DEFAULT EXTRACT(YEAR FROM a_date);
    month             INT DEFAULT EXTRACT(MONTH FROM a_date);
    day_of_month      INT DEFAULT EXTRACT(DAY FROM a_date);
    last_day_of_month INT DEFAULT EXTRACT(DAY FROM LAST_DAY(a_date));
    hour              INT DEFAULT EXTRACT(HOUR FROM CAST(a_date AS TIMESTAMP));
    minute            INT DEFAULT EXTRACT(MINUTE FROM CAST(a_date AS TIMESTAMP));
    second            INT DEFAULT EXTRACT(SECOND FROM CAST(a_date AS TIMESTAMP));
    value             INT DEFAULT 0;
    r_date            DATE DEFAULT a_date;
BEGIN
    IF (location = '' OR location IS NULL) OR (movement = '' OR movement IS NULL) THEN
        RETURN a_date;
    ELSE
        value := TO_NUMBER(movement);

        IF location = 'Y' THEN
            IF command = '' OR command IS NULL THEN
                -- set directly
                year := value;
            ELSIF command = '+' THEN
                -- add year
                RETURN ADD_MONTHS(a_date, value * 12);
            ELSIF command = '-' THEN
                -- subtract year
                RETURN ADD_MONTHS(a_date, value * -12);
            ELSE
                RETURN null;
            END IF;
        ELSIF location = 'M' THEN
            IF command = '' OR command IS NULL THEN
                month := CASE WHEN value < 1 THEN 1 WHEN value > 12 THEN 12 ELSE value END;
            ELSIF command = '+' THEN
                RETURN ADD_MONTHS(a_date, value);
            ELSIF command = '-' THEN
                RETURN ADD_MONTHS(a_date, value * -1);
            ELSE
                RETURN a_date;
            END IF;
        ELSIF location = 'D' THEN
            IF value = 99 THEN
                day_of_month := 31;
            ELSIF command = '' OR command IS NULL THEN
                day_of_month := CASE WHEN value < 1 THEN 1 ELSE value END;
            ELSIF command = '+' THEN
                SELECT a_date + value INTO r_date FROM DUAL;
                RETURN r_date;
            ELSIF command = '-' THEN
                SELECT a_date - value INTO r_date FROM DUAL;
                RETURN r_date;
            ELSE
                RETURN a_date;
            END IF;
        ELSIF location = 'h' THEN
            IF command = '' OR command IS NULL THEN
                hour := CASE WHEN value < 0 THEN 0 WHEN value > 23 THEN 23 ELSE value END;
            ELSIF command = '+' THEN
                SELECT (a_date + value / 24) INTO r_date FROM DUAL;
                RETURN r_date;
            ELSIF command = '-' THEN
                SELECT (a_date - value / 24) INTO r_date FROM DUAL;
                RETURN r_date;
            ELSE
                RETURN a_date;
            END IF;
        ELSIF location = 'm' THEN
            IF command = '' OR command IS NULL THEN
                minute := CASE WHEN value < 0 THEN 0 WHEN value > 59 THEN 59 ELSE value END;
            ELSIF command = '+' THEN
                SELECT (a_date + value / 1440) INTO r_date FROM DUAL;
                RETURN r_date;
            ELSIF command = '-' THEN
                SELECT (a_date - value / 1440) INTO r_date FROM DUAL;
                RETURN r_date;
            ELSE
                RETURN a_date;
            END IF;
        ELSIF location = 's' THEN
            IF command = '' OR command IS NULL THEN
                second := CASE WHEN value < 0 THEN 0 WHEN value > 59 THEN 59 ELSE value END;
            ELSIF command = '+' THEN
                SELECT (a_date + value / 86400) INTO r_date FROM DUAL;
                RETURN r_date;
            ELSIF command = '-' THEN
                SELECT (a_date - value / 86400) INTO r_date FROM DUAL;
                RETURN r_date;
            ELSE
                RETURN a_date;
            END IF;
        END IF;

        -- if day of month is greater than last day of month, reset it
        last_day_of_month := DAY(LAST_DAY(TO_DATE(
                    TO_CHAR(a_date, 'YYYY') || '-' || CASE WHEN month < 10 THEN CONCAT('0', month) ELSE month END ||
                    '-01',
                    'YYYY-MM-DD')));
        IF day_of_month > last_day_of_month THEN
            day_of_month := last_day_of_month;
        END IF;

        RETURN TO_DATE(year || '-'
                           || CASE WHEN month < 10 THEN '0' || month ELSE '' || month END || '-'
                           || CASE WHEN day_of_month < 10 THEN '0' || day_of_month ELSE '' || day_of_month END || ' '
                           || CASE WHEN hour < 10 THEN '0' || hour ELSE '' || hour END || ':'
                           || CASE WHEN minute < 10 THEN '0' || minute ELSE '' || minute END || ':'
                           || CASE WHEN second < 10 THEN '0' || second ELSE '' || second END,
                       'YYYY-MM-DD HH24:MI:SS');
    END IF;
END;

CREATE OR REPLACE FUNCTION MOVEDATE(a_date IN DATE, pattern VARCHAR2)
    RETURN DATE
    IS
    pattern_length     INT DEFAULT LENGTH(pattern);
    pattern_char_index INT DEFAULT 1;
    pattern_char       VARCHAR2(1) DEFAULT '';
    location           VARCHAR2(1) DEFAULT '';
    command            VARCHAR2(1) DEFAULT '';
    movement           VARCHAR2(100) DEFAULT '';
    computed           DATE DEFAULT a_date;
BEGIN
    WHILE pattern_char_index <= pattern_length
        LOOP
            pattern_char := SUBSTR(pattern, pattern_char_index, 1);
            IF INSTR('YMDhms', pattern_char) != 0 THEN
                -- location char
                -- let's say a new movement segment is started now
                computed := MOVEDATE2(computed, location, command, movement);
                -- set location to new one, clear command and movement
                location := pattern_char;
                command := '';
                movement := '';
            ELSIF INSTR('+-', pattern_char) != 0 THEN
                -- command char
                command := pattern_char;
                movement := '';
            ELSE
                -- should be a movement char, movement can be chars
                movement := CONCAT(movement, pattern_char);
            END IF;
            pattern_char_index := pattern_char_index + 1;
        END LOOP;

    IF INSTR('YMDhms', location) != 0 THEN
        computed := MOVEDATE2(computed, location, command, movement);
    END IF;

    RETURN computed;
END;
