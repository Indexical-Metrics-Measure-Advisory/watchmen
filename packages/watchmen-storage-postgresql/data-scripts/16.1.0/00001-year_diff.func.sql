CREATE OR REPLACE FUNCTION YEARDIFF(end_date IN TIMESTAMPTZ, start_date IN TIMESTAMPTZ) RETURNS SMALLINT AS
$$
DECLARE
    end_year                SMALLINT DEFAULT EXTRACT(YEAR FROM end_date);
    end_month               SMALLINT DEFAULT EXTRACT(MONTH FROM end_date);
    end_day                 SMALLINT DEFAULT EXTRACT(DAY FROM end_date);
    end_last_day_of_month   SMALLINT DEFAULT EXTRACT(DAY FROM
                                                     (DATE_TRUNC('MONTH', end_date) + INTERVAL '1 MONTH - 1 DAY'));
    start_year              SMALLINT DEFAULT EXTRACT(YEAR FROM start_date);
    start_month             SMALLINT DEFAULT EXTRACT(MONTH FROM start_date);
    start_day               SMALLINT DEFAULT EXTRACT(DAY FROM start_date);
    start_last_day_of_month SMALLINT DEFAULT EXTRACT(DAY FROM
                                                     (DATE_TRUNC('MONTH', start_date) + INTERVAL '1 MONTH - 1 DAY'));
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
$$ LANGUAGE PLPGSQL;
