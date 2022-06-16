CREATE OR REPLACE FUNCTION WEEK(a_date IN TIMESTAMPTZ)
    RETURNS SMALLINT AS
$$
DECLARE
    first_day_of_year            DATE DEFAULT TO_DATE(EXTRACT(YEAR FROM a_date) || '0101', 'YYYYMMDD');
    -- Sunday 1 to Saturday 7
    weekday_of_first_day_of_year SMALLINT DEFAULT CAST(TO_CHAR(first_day_of_year, 'D') AS SMALLINT);
    days_of_year_of_given_date   SMALLINT DEFAULT CAST(TO_CHAR(a_date, 'DDD') AS SMALLINT);
    days_of_first_week           SMALLINT DEFAULT MOD(8 - weekday_of_first_day_of_year, 7);
    weeks                        SMALLINT;
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
        weeks := CEIL((days_of_year_of_given_date - days_of_first_week) * 1.0 / 7);
        RETURN weeks;
    END IF;
END;
$$ LANGUAGE PLPGSQL;
