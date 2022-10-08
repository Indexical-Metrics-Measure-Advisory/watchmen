CREATE OR ALTER FUNCTION MOVEDATE2(
    @a_date DATETIME, @location NVARCHAR(1), @command NVARCHAR(1), @movement NVARCHAR(100))
    RETURNS DATETIME
AS
BEGIN
    DECLARE @year INT =YEAR(@a_date);
    DECLARE @month INT =MONTH(@a_date);
    DECLARE @day_of_month INT = DAY(@a_date);
    DECLARE @last_day_of_month INT = DAY(EOMONTH(@a_date));
    DECLARE @hour INT = DATEPART(HOUR, @a_date);
    DECLARE @minute INT = DATEPART(MINUTE, @a_date);
    DECLARE @second INT = DATEPART(SECOND, @a_date);

    DECLARE @value INT = 0;

    IF @location = '' OR @movement = ''
        RETURN @a_date;

    SET @value = CAST(@movement AS INT);

    IF CAST(@location AS BINARY) = CAST('Y' AS BINARY)
        BEGIN
            IF @command = ''
                -- set directly
                SET @year = @value;
            ELSE
                IF @command = '+'
                    -- add year
                    RETURN DATEADD(YEAR, @value, @a_date);
                ELSE
                    IF @command = '-'
                        -- subtract year
                        RETURN DATEADD(YEAR, 0 - @value, @a_date);
                    ELSE
                        RETURN @a_date;
        END;
    ELSE
        IF CAST(@location AS BINARY) = CAST('M' AS BINARY)
            BEGIN
                IF @command = ''
                    SET @month = IIF(@value < 1, 1, IIF(@value > 12, 12, @value));
                ELSE
                    IF @command = '+'
                        RETURN DATEADD(MONTH, @value, @a_date);
                    ELSE
                        IF @command = '-'
                            RETURN DATEADD(MONTH, 0 - @value, @a_date);
                        ELSE
                            RETURN @a_date;
            END;
        ELSE
            IF CAST(@location AS BINARY) = CAST('D' AS BINARY)
                BEGIN
                    IF @value = 99
                        SET @day_of_month = 31;
                    ELSE
                        IF @command = ''
                            SET @day_of_month = IIF(@value < 1, 1, @value);
                        ELSE
                            IF @command = '+'
                                RETURN DATEADD(DAY, @value, @a_date);
                            ELSE
                                IF @command = '-'
                                    RETURN DATEADD(DAY, 0 - @value, @a_date);
                                ELSE
                                    RETURN @a_date;
                END;
            ELSE
                IF CAST(@location AS BINARY) = CAST('h' AS BINARY)
                    BEGIN
                        IF @command = ''
                            SET @hour = IIF(@value < 0, 0, IIF(@value > 23, 23, @value));
                        ELSE
                            IF @command = '+'
                                RETURN DATEADD(HOUR, @value, @a_date);
                            ELSE
                                IF @command = '-'
                                    RETURN DATEADD(HOUR, 0 - @value, @a_date);
                                ELSE
                                    RETURN @a_date;
                    END;
                ELSE
                    IF CAST(@location AS BINARY) = CAST('m' AS BINARY)
                        BEGIN
                            IF @command = ''
                                SET @minute = IIF(@value < 0, 0, IIF(@value > 59, 59, @value));
                            ELSE
                                IF @command = '+'
                                    RETURN DATEADD(MINUTE, @value, @a_date);
                                ELSE
                                    IF @command = '-'
                                        RETURN DATEADD(MINUTE, 0 - @value, @a_date);
                                    ELSE
                                        RETURN @a_date;
                        END;
                    ELSE
                        IF CAST(@location AS BINARY) = CAST('s' AS BINARY)
                            BEGIN
                                IF @command = ''
                                    SET @second = IIF(@value < 0, 0, IIF(@value > 59, 59, @value));
                                ELSE
                                    IF @command = '+'
                                        RETURN DATEADD(SECOND, @value, @a_date);
                                    ELSE
                                        IF @command = '-'
                                            RETURN DATEADD(SECOND, 0 - @value, @a_date);
                                        ELSE
                                            RETURN @a_date;
                            END;
    -- if day of month is greater than last day of month, reset it
    SET @last_day_of_month = DAY(EOMONTH(PARSE(
            CONCAT(FORMAT(@a_date, 'yyyy'), '-', IIF(@month < 10, CONCAT('0', @month), @month),
                   '-01') AS DATE)));
    IF @day_of_month > @last_day_of_month
        SET @day_of_month = @last_day_of_month;

    RETURN PARSE(CONCAT(@year, '-',
                        IIF(@month < 10, CONCAT('0', @month), @month), '-',
                        IIF(@day_of_month < 10, CONCAT('0', @day_of_month), @day_of_month), ' ',
                        IIF(@hour < 10, CONCAT('0', @hour), @hour), ':',
                        IIF(@minute < 10, CONCAT('0', @minute), @minute), ':',
                        IIF(@second < 10, CONCAT('0', @second), @second)
        ) AS DATETIME);
END;
GO;

CREATE OR ALTER FUNCTION MOVEDATE(@a_date DATETIME, @pattern NVARCHAR(100))
    RETURNS DATETIME
AS
BEGIN
    DECLARE @pattern_length INT = LEN(@pattern);
    DECLARE @pattern_char_index INT = 0;
    DECLARE @pattern_char VARCHAR(1) = '';

    DECLARE @location VARCHAR(1) = '';
    DECLARE @command VARCHAR(1) = '';
    DECLARE @movement VARCHAR(100) = '';

    DECLARE @computed DATETIME = @a_date;

    WHILE @pattern_char_index < @pattern_length
        BEGIN
            SET @pattern_char_index = @pattern_char_index + 1;

            SET @pattern_char = SUBSTRING(@pattern, @pattern_char_index, 1);
            IF CHARINDEX(@pattern_char, 'YMDhms') != 0
                BEGIN
                    -- @location char
                    -- let's say a new @movement segment is started now
                    SET @computed = DBO.MOVEDATE2(@computed, @location, @command, @movement);
                    -- set @location to new one, clear @command and @movement
                    SET @location = @pattern_char;
                    SET @command = '';
                    SET @movement = '';
                END;
            ELSE
                IF CHARINDEX(@pattern_char, '+-') != 0
                    BEGIN
                        -- @command char
                        SET @command = @pattern_char;
                        SET @movement = '';
                    END;
                ELSE
                    -- should be a @movement char, @movement can be chars
                    SET @movement = CONCAT(@movement, @pattern_char);
        END;

    IF CHARINDEX(@location, 'YMDhms') != 0
        SET @computed = DBO.MOVEDATE2(@computed, @location, @command, @movement);

    RETURN @computed;
END;
GO;
