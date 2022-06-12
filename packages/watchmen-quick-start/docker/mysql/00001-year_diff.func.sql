# https://dev.mysql.com/doc/refman/5.7/en/stored-programs-logging.html
# set global log_bin_trust_function_creators=1;
DROP FUNCTION IF EXISTS YEARDIFF;

DELIMITER |
CREATE FUNCTION YEARDIFF(end_date DATE, start_date DATE)
    RETURNS INT
    DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE end_year INT DEFAULT YEAR(end_date);
    DECLARE end_month INT DEFAULT MONTH(end_date);
    DECLARE end_day INT DEFAULT DAY(end_date);
    DECLARE end_last_day_of_month INT DEFAULT DAY(LAST_DAY(end_date));
    DECLARE start_year INT DEFAULT YEAR(start_date);
    DECLARE start_month INT DEFAULT MONTH(start_date);
    DECLARE start_day INT DEFAULT DAY(start_date);
    DECLARE start_last_day_of_month INT DEFAULT DAY(LAST_DAY(start_date));

    IF end_year = start_year THEN
        # same year, always return 0
        RETURN 0;
    ELSEIF end_year > start_year THEN
        IF end_month = start_month THEN
            IF end_day >= start_day THEN
                RETURN end_year - start_year;
            ELSEIF end_month = 2 THEN
                IF end_day = end_last_day_of_month AND start_day >= end_day THEN
                    RETURN end_year - start_year;
                ELSE
                    RETURN end_year - start_year - 1;
                END IF;
            ELSE
                RETURN end_year - start_year - 1;
            END IF;
        ELSEIF end_month > start_month THEN
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
        ELSEIF end_month > start_month THEN
            RETURN end_year - start_year + 1;
        ELSE
            RETURN end_year - start_year;
        END IF;
    END IF;
END|
DELIMITER ;
