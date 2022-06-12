# https://dev.mysql.com/doc/refman/5.7/en/stored-programs-logging.html
# set global log_bin_trust_function_creators=1;
DROP FUNCTION IF EXISTS MONTHDIFF;

DELIMITER |
CREATE FUNCTION MONTHDIFF(end_date DATE, start_date DATE)
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
        IF end_month = start_month THEN
            # same year, same month, always RETURN 0
            RETURN 0;
        ELSEIF end_month > start_month THEN
            IF end_day >= start_day THEN
                RETURN end_month - start_month;
            ELSEIF end_last_day_of_month = end_day AND start_day >= end_day THEN
                # it is last day of end month
                RETURN end_month - start_month;
            ELSE
                RETURN end_month - start_month - 1;
            END IF;
        ELSE
            # end date is before start date
            IF end_day > start_day THEN
                IF start_last_day_of_month = start_day AND end_day >= start_day THEN
                    # it is last day of start month
                    RETURN end_month - start_month;
                ELSE
                    RETURN end_month - start_month + 1;
                END IF;
            ELSE
                RETURN end_month - start_month;
            END IF;
        END IF;
    ELSEIF end_year > start_year THEN
        IF end_day >= start_day THEN
            RETURN (end_year - start_year) * 12 + end_month - start_month;
        ELSEIF end_last_day_of_month = end_day AND start_day >= end_day THEN
            RETURN (end_year - start_year) * 12 + end_month - start_month;
        ELSE
            RETURN (end_year - start_year) * 12 + end_month - start_month + 1;
        END IF;
    ELSE
        # end year is before start year
        IF end_day > start_day THEN
            IF start_last_day_of_month = start_day AND end_day >= start_day THEN
                # it is last day of start month
                RETURN (end_year - start_year + 1) * 12 + 12 - end_month + start_month;
            ELSE
                RETURN (end_year - start_year + 1) * 12 + 12 - end_month + start_month - 1;
            END IF;
        ELSE
            RETURN (end_year - start_year + 1) * 12 + 12 - end_month + start_month;
        END IF;
    END IF;
END|
DELIMITER ;
