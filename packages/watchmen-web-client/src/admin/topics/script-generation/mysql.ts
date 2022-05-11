import {asPrecision} from '@/admin/topics/script-generation/utils';
import {FactorType} from '@/services/data/tuples/factor-types';

export const MySQLFactorTypeMap: Record<FactorType, (precision?: string) => string> = {
	[FactorType.SEQUENCE]: () => 'BIGINT',

	[FactorType.NUMBER]: (precision) => `DECIMAL(${asPrecision('32,6', precision)})`,
	[FactorType.UNSIGNED]: (precision) => `DECIMAL(${asPrecision('32,6', precision)})`,

	[FactorType.TEXT]: (precision) => `VARCHAR(${asPrecision('255', precision)})`,

	// address
	[FactorType.ADDRESS]: () => 'TEXT',
	[FactorType.CONTINENT]: (precision) => `VARCHAR(${asPrecision('10', precision)})`,
	[FactorType.REGION]: (precision) => `VARCHAR(${asPrecision('10', precision)})`,
	[FactorType.COUNTRY]: (precision) => `VARCHAR(${asPrecision('10', precision)})`,
	[FactorType.PROVINCE]: (precision) => `VARCHAR(${asPrecision('10', precision)})`,
	[FactorType.CITY]: (precision) => `VARCHAR(${asPrecision('10', precision)})`,
	[FactorType.DISTRICT]: (precision) => `VARCHAR(${asPrecision('255', precision)})`,
	[FactorType.ROAD]: (precision) => `VARCHAR(${asPrecision('255', precision)})`,
	[FactorType.COMMUNITY]: (precision) => `VARCHAR(${asPrecision('100', precision)})`,
	[FactorType.FLOOR]: () => 'SMALLINT',
	[FactorType.RESIDENCE_TYPE]: (precision) => `VARCHAR(${asPrecision('10', precision)})`,
	[FactorType.RESIDENTIAL_AREA]: (precision) => `DECIMAL(${asPrecision('10,2', precision)})`,

	// contact electronic
	[FactorType.EMAIL]: (precision) => `VARCHAR(${asPrecision('100', precision)})`,
	[FactorType.PHONE]: (precision) => `VARCHAR(${asPrecision('50', precision)})`,
	[FactorType.MOBILE]: (precision) => `VARCHAR(${asPrecision('50', precision)})`,
	[FactorType.FAX]: (precision) => `VARCHAR(${asPrecision('50', precision)})`,

	// date time related
	[FactorType.DATETIME]: () => 'DATETIME',
	[FactorType.FULL_DATETIME]: () => 'DATETIME',
	[FactorType.DATE]: () => 'DATE',
	[FactorType.TIME]: () => 'TIME',
	[FactorType.YEAR]: () => 'TINYINT',
	[FactorType.HALF_YEAR]: () => 'TINYINT',
	[FactorType.QUARTER]: () => 'TINYINT',
	[FactorType.MONTH]: () => 'TINYINT',
	[FactorType.HALF_MONTH]: () => 'TINYINT',
	[FactorType.TEN_DAYS]: () => 'TINYINT',
	[FactorType.WEEK_OF_YEAR]: () => 'TINYINT',
	[FactorType.WEEK_OF_MONTH]: () => 'TINYINT',
	[FactorType.HALF_WEEK]: () => 'TINYINT',
	[FactorType.DAY_OF_MONTH]: () => 'TINYINT',
	[FactorType.DAY_OF_WEEK]: () => 'TINYINT',
	[FactorType.DAY_KIND]: () => 'TINYINT',
	[FactorType.HOUR]: () => 'TINYINT',
	[FactorType.HOUR_KIND]: () => 'TINYINT',
	[FactorType.MINUTE]: () => 'TINYINT',
	[FactorType.SECOND]: () => 'TINYINT',
	[FactorType.MILLISECOND]: () => 'TINYINT',
	[FactorType.AM_PM]: () => 'TINYINT',

	// individual
	[FactorType.GENDER]: (precision) => `VARCHAR(${asPrecision('10', precision)})`,
	[FactorType.OCCUPATION]: (precision) => `VARCHAR(${asPrecision('10', precision)})`,
	[FactorType.DATE_OF_BIRTH]: () => 'DATE',
	[FactorType.AGE]: () => 'SMALLINT',
	[FactorType.ID_NO]: (precision) => `VARCHAR(${asPrecision('50', precision)})`,
	[FactorType.RELIGION]: (precision) => `VARCHAR(${asPrecision('10', precision)})`,
	[FactorType.NATIONALITY]: (precision) => `VARCHAR(${asPrecision('10', precision)})`,

	// organization
	[FactorType.BIZ_TRADE]: (precision) => `VARCHAR(${asPrecision('10', precision)})`,
	[FactorType.BIZ_SCALE]: () => 'INT',

	[FactorType.BOOLEAN]: () => 'TINYINT',

	[FactorType.ENUM]: (precision) => `VARCHAR(${asPrecision('20', precision)})`,

	[FactorType.OBJECT]: () => 'JSON',
	[FactorType.ARRAY]: () => 'JSON'
};
