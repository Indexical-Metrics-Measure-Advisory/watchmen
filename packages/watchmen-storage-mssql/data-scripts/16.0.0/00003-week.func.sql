CREATE OR ALTER FUNCTION WEEK(@a_date DATETIME)
    RETURNS INT
AS
BEGIN
    DECLARE @first_day_of_year DATE= CONVERT(DATE, CONCAT(YEAR(@a_date), '0101'), 112);
    -- Sunday 1 to Saturday 7
    DECLARE @weekday_of_first_day_of_year INT= DATEPART(WEEKDAY, @first_day_of_year);
    DECLARE @days_of_year_of_given_date INT= DATEPART(DAYOFYEAR, @a_date);
    DECLARE @days_of_first_week INT= (8 - @weekday_of_first_day_of_year) % 7;
    DECLARE @ret INT

    IF @days_of_year_of_given_date <= @days_of_first_week
        -- given date is in first week
        IF @days_of_first_week < 7
            -- first week is short
            SET @ret = 0;
        ELSE
            -- first week is full week
            SET @ret = 1;
    ELSE
        SET @ret = CEILING((@days_of_year_of_given_date - @days_of_first_week) * 1.0 / 7);

    RETURN @ret
END;
GO
