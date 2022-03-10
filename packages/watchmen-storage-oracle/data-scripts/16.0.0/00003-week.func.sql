CREATE OR REPLACE FUNCTION WEEK(a_date IN DATE)
    RETURN NUMBER
    IS
    first_day_of_year            DATE DEFAULT TO_DATE(EXTRACT(YEAR FROM a_date) || '0101', 'YYYYMMDD');
    -- Sunday 1 to Saturday 7
    weekday_of_first_day_of_year INT DEFAULT TO_NUMBER(TO_CHAR(first_day_of_year, 'D'));
    days_of_year_of_given_date   INT DEFAULT TO_NUMBER(TO_CHAR(a_date, 'DDD'));
    days_of_first_week           INT DEFAULT (8 - weekday_of_first_day_of_year) MOD 7;
    weeks                        INT;
BEGIN
    IF days_of_year_of_given_date <= days_of_first_week THEN
        -- given date is in first week
        IF days_of_first_week < 7 THEN
            -- first week is short
            RETURN 0;
        ELSE
            -- first week is full week
            RETURN 1;
        END IF;
    ELSE
        weeks := CEIL((days_of_year_of_given_date - days_of_first_week) / 7);
        RETURN weeks;
    END IF;
END;
