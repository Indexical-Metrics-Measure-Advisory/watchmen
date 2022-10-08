CREATE OR REPLACE FUNCTION MOVEDATE2(a_date IN TIMESTAMPTZ, location VARCHAR, command VARCHAR, movement VARCHAR)
    RETURNS TIMESTAMPTZ AS
$$
DECLARE
    year              INT DEFAULT EXTRACT(YEAR FROM a_date);
    month             INT DEFAULT EXTRACT(MONTH FROM a_date);
    day_of_month      INT DEFAULT EXTRACT(DAY FROM a_date);
    last_day_of_month INT DEFAULT EXTRACT(DAY FROM (DATE_TRUNC('MONTH', a_date) + INTERVAL '1 MONTH - 1 DAY'));
    hour              INT DEFAULT EXTRACT(HOUR FROM CAST(a_date AS TIMESTAMP));
    minute            INT DEFAULT EXTRACT(MINUTE FROM CAST(a_date AS TIMESTAMP));
    second            INT DEFAULT EXTRACT(SECOND FROM CAST(a_date AS TIMESTAMP));
    value             INT DEFAULT 0;
    r_date            DATE DEFAULT a_date;
BEGIN
    IF location != '' AND movement != '' THEN
        value := CAST(movement AS INT);

        IF location = 'Y' THEN
            IF command = '' THEN
                -- set directly
                year := value;
            ELSIF command = '+' THEN
                -- add year
                RETURN a_date + (value || ' years')::INTERVAL;
            ELSIF command = '-' THEN
                -- subtract year
                RETURN a_date - (value || ' years')::INTERVAL;
            ELSE
                RETURN a_date;
            END IF;
        ELSIF location = 'M' THEN
            IF command = '' THEN
                month := CASE WHEN value < 1 THEN 1 WHEN value > 12 THEN 12 ELSE value END;
            ELSIF command = '+' THEN
                RETURN a_date + (value || ' months')::INTERVAL;
            ELSIF command = '-' THEN
                RETURN a_date - (value || ' months')::INTERVAL;
            ELSE
                RETURN a_date;
            END IF;
        ELSIF location = 'D' THEN
            IF value = 99 THEN
                day_of_month := 31;
            ELSIF command = '' THEN
                day_of_month := CASE WHEN value < 1 THEN 1 ELSE value END;
            ELSIF command = '+' THEN
                RETURN a_date + (value || ' days')::INTERVAL;
            ELSIF command = '-' THEN
                RETURN a_date - (value || ' days')::INTERVAL;
            ELSE
                RETURN a_date;
            END IF;
        ELSIF location = 'h' THEN
            IF command = '' THEN
                hour := CASE WHEN value < 0 THEN 0 WHEN value > 23 THEN 23 ELSE value END;
            ELSIF command = '+' THEN
                RETURN a_date + (value || ' hours')::INTERVAL;
            ELSIF command = '-' THEN
                RETURN a_date - (value || ' hours')::INTERVAL;
            ELSE
                RETURN a_date;
            END IF;
        ELSIF location = 'm' THEN
            IF command = '' THEN
                minute := CASE WHEN value < 0 THEN 0 WHEN value > 59 THEN 59 ELSE value END;
            ELSIF command = '+' THEN
                RETURN a_date + (value || ' minutes')::INTERVAL;
            ELSIF command = '-' THEN
                RETURN a_date - (value || ' minutes')::INTERVAL;
            ELSE
                RETURN a_date;
            END IF;
        ELSIF location = 's' THEN
            IF command = '' THEN
                second := CASE WHEN value < 0 THEN 0 WHEN value > 59 THEN 59 ELSE value END;
            ELSIF command = '+' THEN
                RETURN a_date + (value || ' seconds')::INTERVAL;
            ELSIF command = '-' THEN
                RETURN a_date - (value || ' seconds')::INTERVAL;
            ELSE
                RETURN a_date;
            END IF;
        END IF;

        -- if day of month is greater than last day of month, reset it
        last_day_of_month := EXTRACT(DAY FROM (DATE_TRUNC('MONTH', TO_DATE(
                            TO_CHAR(a_date, 'YYYY') || '-'
                        || CASE
                               WHEN month < 10 THEN CONCAT('0', month)
                               ELSE '' || month END || '-01',
                            'YYYY-MM-DD'))) + INTERVAL '1 MONTH - 1 DAY');
        IF day_of_month > last_day_of_month THEN
            day_of_month := last_day_of_month;
        END IF;

        RETURN CAST(TO_TIMESTAMP(year || '-'
                                     || CASE WHEN month < 10 THEN '0' || month ELSE '' || month END || '-'
                                     || CASE
                                            WHEN day_of_month < 10 THEN '0' || day_of_month
                                            ELSE '' || day_of_month END || ' '
                                     || CASE WHEN hour < 10 THEN '0' || hour ELSE '' || hour END || ':'
                                     || CASE WHEN minute < 10 THEN '0' || minute ELSE '' || minute END || ':'
                                     || CASE WHEN second < 10 THEN '0' || second ELSE '' || second END,
                                 'YYYY-MM-DD HH24:MI:SS') AS TIMESTAMP WITH TIME ZONE);
    ELSE
        RETURN a_date;
    END IF;
END;
$$ LANGUAGE PLPGSQL;

CREATE OR REPLACE FUNCTION MOVEDATE(a_date IN TIMESTAMPTZ, pattern VARCHAR)
    RETURNS TIMESTAMPTZ AS
$$
DECLARE
    pattern_length     INT DEFAULT LENGTH(pattern);
    pattern_char_index INT DEFAULT 0;
    pattern_char       VARCHAR(1) DEFAULT '';
    location           VARCHAR(1) DEFAULT '';
    command            VARCHAR(1) DEFAULT '';
    movement           VARCHAR(100) DEFAULT '';
    computed           TIMESTAMPTZ DEFAULT a_date;
BEGIN
    pattern_char_index := 1;
    WHILE pattern_char_index <= pattern_length
        LOOP
            pattern_char := SUBSTR(pattern, pattern_char_index, 1);
            IF POSITION(pattern_char IN 'YMDhms') != 0 THEN
                -- location char
                -- let's say a new movement segment is started now
                computed := MOVEDATE2(computed, location, command, movement);
                -- set location to new one, clear command and movement
                location := pattern_char;
                command := '';
                movement := '';
            ELSIF POSITION(pattern_char IN '+-') != 0 THEN
                -- command char
                command := pattern_char;
                movement := '';
            ELSE
                -- should be a movement char, movement can be chars
                movement := CONCAT(movement, pattern_char);
            END IF;
            pattern_char_index := pattern_char_index + 1;
        END LOOP;

    IF POSITION(location IN 'YMDhms') != 0 THEN
        computed := MOVEDATE2(computed, location, command, movement);
    END IF;

    RETURN computed;
END;
$$ LANGUAGE PLPGSQL;
