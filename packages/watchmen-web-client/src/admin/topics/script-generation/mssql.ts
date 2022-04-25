import {FactorType} from '@/services/data/tuples/factor-types';

export const MSSQLFactorTypeMap: Record<FactorType, string> = {
	[FactorType.SEQUENCE]: 'DECIMAL(30)',

	[FactorType.NUMBER]: 'DECIMAL(32,6)',
	[FactorType.UNSIGNED]: 'DECIMAL(32,6)',

	[FactorType.TEXT]: 'NVARCHAR(255)',

	// address
	[FactorType.ADDRESS]: 'NVARCHAR(1024)',
	[FactorType.CONTINENT]: 'NVARCHAR(10)',
	[FactorType.REGION]: 'NVARCHAR(10)',
	[FactorType.COUNTRY]: 'NVARCHAR(10)',
	[FactorType.PROVINCE]: 'NVARCHAR(10)',
	[FactorType.CITY]: 'NVARCHAR(10)',
	[FactorType.DISTRICT]: 'NVARCHAR(255)',
	[FactorType.ROAD]: 'NVARCHAR(255)',
	[FactorType.COMMUNITY]: 'NVARCHAR(100)',
	[FactorType.FLOOR]: 'DECIMAL(5)',
	[FactorType.RESIDENCE_TYPE]: 'NVARCHAR(10)',
	[FactorType.RESIDENTIAL_AREA]: 'DECIMAL(10,2)',

	// contact electronic
	[FactorType.EMAIL]: 'NVARCHAR(100)',
	[FactorType.PHONE]: 'NVARCHAR(64)',
	[FactorType.MOBILE]: 'NVARCHAR(64)',
	[FactorType.FAX]: 'NVARCHAR(64)',

	// date time related
	[FactorType.DATETIME]: 'DATETIME',
	[FactorType.FULL_DATETIME]: 'DATETIME',
	[FactorType.DATE]: 'DATE',
	[FactorType.TIME]: 'TIME',
	[FactorType.YEAR]: 'DECIMAL(5)',
	[FactorType.HALF_YEAR]: 'DECIMAL(3)',
	[FactorType.QUARTER]: 'DECIMAL(3)',
	[FactorType.MONTH]: 'DECIMAL(3)',
	[FactorType.HALF_MONTH]: 'DECIMAL(3)',
	[FactorType.TEN_DAYS]: 'DECIMAL(3)',
	[FactorType.WEEK_OF_YEAR]: 'DECIMAL(3)',
	[FactorType.WEEK_OF_MONTH]: 'DECIMAL(3)',
	[FactorType.HALF_WEEK]: 'DECIMAL(3)',
	[FactorType.DAY_OF_MONTH]: 'DECIMAL(3)',
	[FactorType.DAY_OF_WEEK]: 'DECIMAL(3)',
	[FactorType.DAY_KIND]: 'DECIMAL(3)',
	[FactorType.HOUR]: 'DECIMAL(3)',
	[FactorType.HOUR_KIND]: 'DECIMAL(3)',
	[FactorType.MINUTE]: 'DECIMAL(3)',
	[FactorType.SECOND]: 'DECIMAL(3)',
	[FactorType.MILLISECOND]: 'DECIMAL(3)',
	[FactorType.AM_PM]: 'DECIMAL(3)',

	// individual
	[FactorType.GENDER]: 'NVARCHAR(10)',
	[FactorType.OCCUPATION]: 'NVARCHAR(10)',
	[FactorType.DATE_OF_BIRTH]: 'DATE',
	[FactorType.AGE]: 'DECIMAL(5)',
	[FactorType.ID_NO]: 'NVARCHAR(50)',
	[FactorType.RELIGION]: 'NVARCHAR(10)',
	[FactorType.NATIONALITY]: 'NVARCHAR(10)',

	// organization
	[FactorType.BIZ_TRADE]: 'NVARCHAR(10)',
	[FactorType.BIZ_SCALE]: 'DECIMAL(9)',

	[FactorType.BOOLEAN]: 'TINYINT',

	[FactorType.ENUM]: 'NVARCHAR(20)',

	[FactorType.OBJECT]: 'NVARCHAR(MAX)',
	[FactorType.ARRAY]: 'NVARCHAR(MAX)'
};