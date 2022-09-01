import {FactorType} from '@/services/data/tuples/factor-types';
import {asPrecision} from './utils';

export const MSSQLFactorTypeMap: Record<FactorType, (precision?: string) => string> = {
	[FactorType.SEQUENCE]: () => `DECIMAL(20)`,

	[FactorType.NUMBER]: (precision) => `DECIMAL(${asPrecision('32,6', precision)})`,
	[FactorType.UNSIGNED]: (precision) => `DECIMAL(${asPrecision('32,6', precision)})`,

	[FactorType.TEXT]: (precision) => `NVARCHAR(${asPrecision('255', precision)})`,

	// address
	[FactorType.ADDRESS]: () => 'NVARCHAR(1024)',
	[FactorType.CONTINENT]: (precision) => `NVARCHAR(${asPrecision('10', precision)})`,
	[FactorType.REGION]: (precision) => `NVARCHAR(${asPrecision('10', precision)})`,
	[FactorType.COUNTRY]: (precision) => `NVARCHAR(${asPrecision('10', precision)})`,
	[FactorType.PROVINCE]: (precision) => `NVARCHAR(${asPrecision('10', precision)})`,
	[FactorType.CITY]: (precision) => `NVARCHAR(${asPrecision('10', precision)})`,
	[FactorType.DISTRICT]: (precision) => `NVARCHAR(${asPrecision('255', precision)})`,
	[FactorType.ROAD]: (precision) => `NVARCHAR(${asPrecision('255', precision)})`,
	[FactorType.COMMUNITY]: (precision) => `NVARCHAR(${asPrecision('100', precision)})`,
	[FactorType.FLOOR]: () => `DECIMAL(5)`,
	[FactorType.RESIDENCE_TYPE]: (precision) => `NVARCHAR(${asPrecision('10', precision)})`,
	[FactorType.RESIDENTIAL_AREA]: (precision) => `DECIMAL(${asPrecision('10,2', precision)})`,

	// contact electronic
	[FactorType.EMAIL]: (precision) => `NVARCHAR(${asPrecision('100', precision)})`,
	[FactorType.PHONE]: (precision) => `NVARCHAR(${asPrecision('50', precision)})`,
	[FactorType.MOBILE]: (precision) => `NVARCHAR(${asPrecision('50', precision)})`,
	[FactorType.FAX]: (precision) => `NVARCHAR(${asPrecision('50', precision)})`,

	// date time related
	[FactorType.DATETIME]: () => 'DATETIME',
	[FactorType.FULL_DATETIME]: () => 'DATETIME',
	[FactorType.DATE]: () => 'DATE',
	[FactorType.TIME]: () => 'TIME',
	[FactorType.YEAR]: () => 'DECIMAL(5)',
	[FactorType.HALF_YEAR]: () => 'DECIMAL(3)',
	[FactorType.QUARTER]: () => 'DECIMAL(3)',
	[FactorType.MONTH]: () => 'DECIMAL(3)',
	[FactorType.HALF_MONTH]: () => 'DECIMAL(3)',
	[FactorType.TEN_DAYS]: () => 'DECIMAL(3)',
	[FactorType.WEEK_OF_YEAR]: () => 'DECIMAL(3)',
	[FactorType.WEEK_OF_MONTH]: () => 'DECIMAL(3)',
	[FactorType.HALF_WEEK]: () => 'DECIMAL(3)',
	[FactorType.DAY_OF_MONTH]: () => 'DECIMAL(3)',
	[FactorType.DAY_OF_WEEK]: () => 'DECIMAL(3)',
	[FactorType.DAY_KIND]: () => 'DECIMAL(3)',
	[FactorType.HOUR]: () => 'DECIMAL(3)',
	[FactorType.HOUR_KIND]: () => 'DECIMAL(3)',
	[FactorType.MINUTE]: () => 'DECIMAL(3)',
	[FactorType.SECOND]: () => 'DECIMAL(3)',
	[FactorType.MILLISECOND]: () => 'DECIMAL(3)',
	[FactorType.AM_PM]: () => 'DECIMAL(3)',

	// individual
	[FactorType.GENDER]: (precision) => `NVARCHAR(${asPrecision('10', precision)})`,
	[FactorType.OCCUPATION]: (precision) => `NVARCHAR(${asPrecision('10', precision)})`,
	[FactorType.DATE_OF_BIRTH]: () => 'DATE',
	[FactorType.AGE]: () => 'DECIMAL(5)',
	[FactorType.ID_NO]: (precision) => `NVARCHAR(${asPrecision('50', precision)})`,
	[FactorType.RELIGION]: (precision) => `NVARCHAR(${asPrecision('10', precision)})`,
	[FactorType.NATIONALITY]: (precision) => `NVARCHAR(${asPrecision('10', precision)})`,

	// organization
	[FactorType.BIZ_TRADE]: (precision) => `NVARCHAR(${asPrecision('10', precision)})`,
	[FactorType.BIZ_SCALE]: () => 'DECIMAL(9)',

	[FactorType.BOOLEAN]: () => 'TINYINT',

	[FactorType.ENUM]: (precision) => `NVARCHAR(${asPrecision('20', precision)})`,

	[FactorType.OBJECT]: () => 'NVARCHAR(MAX)',
	[FactorType.ARRAY]: () => 'NVARCHAR(MAX)'
};