CREATE OR ALTER FUNCTION WEEKOFMONTH(@a_date DATETIME)
    RETURNS INT
AS
BEGIN
    DECLARE @first_day DATE= DATEADD(DAY, 1, EOMONTH(@a_date, -1))
    DECLARE @week_of_year_of_first_day INT= DBO.WEEK(@first_day);
    -- Sunday 1 to Saturday 7
    DECLARE @weekday_of_first_day INT= DATEPART(WEEKDAY, @first_day);
    DECLARE @week_of_year_of_given_date INT= DBO.WEEK(@a_date);
    DECLARE @ret INT

    IF @week_of_year_of_first_day = @week_of_year_of_given_date
        -- 1 is sunday
        IF @weekday_of_first_day = 1
            -- first week is full week
            SET @ret = 1;
        ELSE
            -- first week is short
            SET @ret = 0;
    ELSE
        IF @weekday_of_first_day = 1
            -- first week is full week, must add 1
            SET @ret = @week_of_year_of_given_date - @week_of_year_of_first_day + 1;
        ELSE
            -- first week is short
            SET @ret = @week_of_year_of_given_date - @week_of_year_of_first_day;

    RETURN @ret;
END;
GO
