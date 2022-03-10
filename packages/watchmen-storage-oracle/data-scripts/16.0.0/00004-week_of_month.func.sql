CREATE OR REPLACE FUNCTION WEEKOFMONTH(a_date IN DATE)
    RETURN NUMBER
    IS
    first_day                  DATE DEFAULT ADD_MONTHS(LAST_DAY(a_date) + 1, -1);
    week_of_year_of_first_day  INT DEFAULT WEEKOFYEAR(first_day);
    -- Sunday 1 to Saturday 7
    weekday_of_first_day       INT DEFAULT TO_NUMBER(TO_CHAR(first_day, 'D'));
    week_of_year_of_given_date INT DEFAULT WEEKOFYEAR(a_date);
BEGIN
    IF week_of_year_of_first_day = week_of_year_of_given_date THEN
        -- 1 is sunday
        IF weekday_of_first_day = 1 THEN
            -- first week is full week
            RETURN 1;
        ELSE
            -- first week is short
            RETURN 0;
        END IF;
    ELSE
        -- 1 is sunday
        IF weekday_of_first_day = 1 THEN
            -- first week is full week, must add 1
            RETURN week_of_year_of_given_date - week_of_year_of_first_day + 1;
        ELSE
            -- first week is short
            RETURN week_of_year_of_given_date - week_of_year_of_first_day;
        END IF;
    END IF;
END;
