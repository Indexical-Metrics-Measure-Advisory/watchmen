# https://dev.mysql.com/doc/refman/5.7/en/stored-programs-logging.html
# set global log_bin_trust_function_creators=1;
DROP FUNCTION IF EXISTS WEEKOFMONTH;

DELIMITER |
CREATE FUNCTION WEEKOFMONTH(date DATE)
    RETURNS INT
    DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE first_day DATE DEFAULT DATE_SUB(DATE_ADD(LAST_DAY(date), INTERVAL 1 DAY), INTERVAL 1 MONTH);
    DECLARE week_of_year_of_first_day INT DEFAULT WEEK(first_day);
    DECLARE weekday_of_first_day INT DEFAULT WEEKDAY(first_day);
    DECLARE week_of_year_of_given_date INT DEFAULT WEEK(date);

    IF week_of_year_of_first_day = week_of_year_of_given_date THEN
        # 6 is sunday
        IF weekday_of_first_day = 6 THEN
            # first week is full week
            RETURN 1;
        ELSE
            # first week is short
            RETURN 0;
        END IF;
    ELSE
        # 6 is sunday
        IF weekday_of_first_day = 6 THEN
            # first week is full week, must add 1
            RETURN week_of_year_of_given_date - week_of_year_of_first_day + 1;
        ELSE
            # first week is short
            RETURN week_of_year_of_given_date - week_of_year_of_first_day;
        END IF;
    END IF;
END|
DELIMITER ;
