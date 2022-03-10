CREATE OR REPLACE FUNCTION QUARTER(a_date IN DATE)
    RETURN NUMBER
    IS
    month_of_given_date INT DEFAULT EXTRACT(MONTH FROM a_date);
BEGIN
    IF month_of_given_date <= 3 THEN
        RETURN 1;
    ELSIF month_of_given_date <= 6 THEN
        RETURN 2;
    ELSIF month_of_given_date <= 9 THEN
        RETURN 3;
    ELSE
        RETURN 4;
    END IF;
END;
