CREATE OR ALTER FUNCTION YEARDIFF(@end_date DATETIME, @start_date DATETIME)
    RETURNS INT
AS
BEGIN
    DECLARE @end_year INT = YEAR(@end_date);
    DECLARE @end_month INT = MONTH(@end_date);
    DECLARE @end_day INT = DAY(@end_date);
    DECLARE @end_last_day_of_month INT = DAY(EOMONTH(@end_date));
    DECLARE @start_year INT = YEAR(@start_date);
    DECLARE @start_month INT = MONTH(@start_date);
    DECLARE @start_day INT = DAY(@start_date);
    DECLARE @start_last_day_of_month INT = DAY(EOMONTH(@start_date));
    DECLARE @ret INT

    IF @end_year = @start_year
        -- same year, always return 0
        SET @ret = 0;
    ELSE
        IF @end_year > @start_year
            IF @end_month = @start_month
                IF @end_day >= @start_day
                    SET @ret = @end_year - @start_year;
                ELSE
                    IF @end_month = 2
                        IF @end_day = @end_last_day_of_month AND @start_day >= @end_day
                            SET @ret = @end_year - @start_year;
                        ELSE
                            SET @ret = @end_year - @start_year - 1;
                    ELSE
                        SET @ret = @end_year - @start_year - 1;
            ELSE
                IF @end_month > @start_month
                    SET @ret = @end_year - @start_year;
                ELSE
                    SET @ret = @end_year - @start_year - 1;
        ELSE
            IF @end_month = @start_month
                IF @end_day > @start_day
                    IF @end_month = 2
                        IF @start_day = @start_last_day_of_month
                            SET @ret = @end_year - @start_year;
                        ELSE
                            SET @ret = @end_year - @start_year + 1;
                    ELSE
                        SET @ret = @end_year - @start_year + 1;
                ELSE
                    SET @ret = @end_year - @start_year;
            ELSE
                IF @end_month > @start_month
                    SET @ret = @end_year - @start_year + 1;
                ELSE
                    SET @ret = @end_year - @start_year;

    RETURN @ret;
END;
GO

