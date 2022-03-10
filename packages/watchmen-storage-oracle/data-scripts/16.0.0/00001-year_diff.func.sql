CREATE OR REPLACE FUNCTION YEARDIFF(end_date IN DATE, start_date IN DATE)
    RETURN NUMBER
    IS
    end_year                NUMBER(4) DEFAULT EXTRACT(YEAR FROM end_date);
    end_month               NUMBER(2) DEFAULT EXTRACT(MONTH FROM end_date);
    end_day                 NUMBER(2) DEFAULT EXTRACT(DAY FROM end_date);
    end_last_day_of_month   NUMBER(2) DEFAULT EXTRACT(DAY FROM LAST_DAY(end_date));
    start_year              NUMBER(4) DEFAULT EXTRACT(YEAR FROM start_date);
    start_month             NUMBER(2) DEFAULT EXTRACT(MONTH FROM start_date);
    start_day               NUMBER(2) DEFAULT EXTRACT(DAY FROM start_date);
    start_last_day_of_month NUMBER(2) DEFAULT EXTRACT(DAY FROM LAST_DAY(start_date));
BEGIN
    IF end_year = start_year THEN
        -- same year, always return 0
        RETURN 0;
    ELSIF end_year > start_year THEN
        IF end_month = start_month THEN
            IF end_day >= start_day THEN
                RETURN end_year - start_year;
            ELSIF end_month = 2 THEN
                IF end_day = end_last_day_of_month AND start_day >= end_day THEN
                    RETURN end_year - start_year;
                ELSE
                    RETURN end_year - start_year - 1;
                END IF;
            ELSE
                RETURN end_year - start_year - 1;
            END IF;
        ELSIF end_month > start_month THEN
            RETURN end_year - start_year;
        ELSE
            RETURN end_year - start_year - 1;
        END IF;
    ELSE
        IF end_month = start_month THEN
            IF end_day > start_day THEN
                IF end_month = 2 THEN
                    IF start_day = start_last_day_of_month THEN
                        RETURN end_year - start_year;
                    ELSE
                        RETURN end_year - start_year + 1;
                    END IF;
                ELSE
                    RETURN end_year - start_year + 1;
                END IF;
            ELSE
                RETURN end_year - start_year;
            END IF;
        ELSIF end_month > start_month THEN
            RETURN end_year - start_year + 1;
        ELSE
            RETURN end_year - start_year;
        END IF;
    END IF;
END;
