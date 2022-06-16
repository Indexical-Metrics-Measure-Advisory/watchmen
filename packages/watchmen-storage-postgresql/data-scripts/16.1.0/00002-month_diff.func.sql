CREATE OR REPLACE FUNCTION MONTHDIFF(end_date IN TIMESTAMPTZ, start_date IN TIMESTAMPTZ)
    RETURNS SMALLINT AS
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
        IF end_month = start_month THEN
            -- same year, same month, always RETURN 0
            RETURN 0;
        ELSIF end_month > start_month THEN
            IF end_day >= start_day THEN
                RETURN end_month - start_month;
            ELSIF end_last_day_of_month = end_day AND start_day >= end_day THEN
                -- it is last day of end month
                RETURN end_month - start_month;
            ELSE
                RETURN end_month - start_month - 1;
            END IF;
        ELSE
            -- end date is before start date
            IF end_day > start_day THEN
                IF start_last_day_of_month = start_day AND end_day >= start_day THEN
                    -- it is last day of start month
                    RETURN end_month - start_month;
                ELSE
                    RETURN end_month - start_month + 1;
                END IF;
            ELSE
                RETURN end_month - start_month;
            END IF;
        END IF;
    ELSIF end_year > start_year THEN
        IF end_day >= start_day THEN
            RETURN (end_year - start_year) * 12 + end_month - start_month;
        ELSIF end_last_day_of_month = end_day AND start_day >= end_day THEN
            RETURN (end_year - start_year) * 12 + end_month - start_month;
        ELSE
            RETURN (end_year - start_year) * 12 + end_month - start_month + 1;
        END IF;
    ELSE
        -- end year is before start year
        IF end_day > start_day THEN
            IF start_last_day_of_month = start_day AND end_day >= start_day THEN
                -- it is last day of start month
                RETURN (end_year - start_year + 1) * 12 + 12 - end_month + start_month;
            ELSE
                RETURN (end_year - start_year + 1) * 12 + 12 - end_month + start_month - 1;
            END IF;
        ELSE
            RETURN (end_year - start_year + 1) * 12 + 12 - end_month + start_month;
        END IF;
    END IF;
END;
$$ LANGUAGE PLPGSQL;
