import {asPrecision} from '@/admin/topics/script-generation/utils';
import {FactorType} from '@/services/data/tuples/factor-types';

export const OracleFactorTypeMap: Record<FactorType, (precision?: string) => string> = {
	[FactorType.SEQUENCE]: () => 'NUMBER(20)',

	[FactorType.NUMBER]: (precision) => `NUMBER(${asPrecision('32,6', precision)})`,
	[FactorType.UNSIGNED]: (precision) => `NUMBER(${asPrecision('32,6', precision)})`,

	[FactorType.TEXT]: (precision) => `VARCHAR2(${asPrecision('255', precision)})`,

	// address
	[FactorType.ADDRESS]: () => 'VARCHAR2(1024)',
	[FactorType.CONTINENT]: (precision) => `VARCHAR2(${asPrecision('10', precision)})`,
	[FactorType.REGION]: (precision) => `VARCHAR2(${asPrecision('10', precision)})`,
	[FactorType.COUNTRY]: (precision) => `VARCHAR2(${asPrecision('10', precision)})`,
	[FactorType.PROVINCE]: (precision) => `VARCHAR2(${asPrecision('10', precision)})`,
	[FactorType.CITY]: (precision) => `VARCHAR2(${asPrecision('10', precision)})`,
	[FactorType.DISTRICT]: (precision) => `VARCHAR2(${asPrecision('255', precision)})`,
	[FactorType.ROAD]: (precision) => `VARCHAR2(${asPrecision('255', precision)})`,
	[FactorType.COMMUNITY]: (precision) => `VARCHAR2(${asPrecision('100', precision)})`,
	[FactorType.FLOOR]: () => 'NUMBER(5)',
	[FactorType.RESIDENCE_TYPE]: (precision) => `VARCHAR2(${asPrecision('10', precision)})`,
	[FactorType.RESIDENTIAL_AREA]: (precision) => `NUMBER(${asPrecision('10,2', precision)})`,

	// contact electronic
	[FactorType.EMAIL]: (precision) => `VARCHAR2(${asPrecision('100', precision)})`,
	[FactorType.PHONE]: (precision) => `VARCHAR2(${asPrecision('50', precision)})`,
	[FactorType.MOBILE]: (precision) => `VARCHAR2(${asPrecision('50', precision)})`,
	[FactorType.FAX]: (precision) => `VARCHAR2(${asPrecision('50', precision)})`,

	// date time related
	[FactorType.DATETIME]: () => 'DATE',
	[FactorType.FULL_DATETIME]: () => 'DATE',
	[FactorType.DATE]: () => 'DATE',
	[FactorType.TIME]: () => 'DATE',
	[FactorType.YEAR]: () => 'NUMBER(5)',
	[FactorType.HALF_YEAR]: () => 'NUMBER(3)',
	[FactorType.QUARTER]: () => 'NUMBER(3)',
	[FactorType.MONTH]: () => 'NUMBER(3)',
	[FactorType.HALF_MONTH]: () => 'NUMBER(3)',
	[FactorType.TEN_DAYS]: () => 'NUMBER(3)',
	[FactorType.WEEK_OF_YEAR]: () => 'NUMBER(3)',
	[FactorType.WEEK_OF_MONTH]: () => 'NUMBER(3)',
	[FactorType.HALF_WEEK]: () => 'NUMBER(3)',
	[FactorType.DAY_OF_MONTH]: () => 'NUMBER(3)',
	[FactorType.DAY_OF_WEEK]: () => 'NUMBER(3)',
	[FactorType.DAY_KIND]: () => 'NUMBER(3)',
	[FactorType.HOUR]: () => 'NUMBER(3)',
	[FactorType.HOUR_KIND]: () => 'NUMBER(3)',
	[FactorType.MINUTE]: () => 'NUMBER(3)',
	[FactorType.SECOND]: () => 'NUMBER(3)',
	[FactorType.MILLISECOND]: () => 'NUMBER(3)',
	[FactorType.AM_PM]: () => 'NUMBER(3)',

	// individual
	[FactorType.GENDER]: (precision) => `VARCHAR2(${asPrecision('10', precision)})`,
	[FactorType.OCCUPATION]: (precision) => `VARCHAR2(${asPrecision('10', precision)})`,
	[FactorType.DATE_OF_BIRTH]: () => 'DATE',
	[FactorType.AGE]: () => 'NUMBER(5)',
	[FactorType.ID_NO]: (precision) => `VARCHAR2(${asPrecision('50', precision)})`,
	[FactorType.RELIGION]: (precision) => `VARCHAR2(${asPrecision('10', precision)})`,
	[FactorType.NATIONALITY]: (precision) => `VARCHAR2(${asPrecision('10', precision)})`,

	// organization
	[FactorType.BIZ_TRADE]: (precision) => `VARCHAR2(${asPrecision('10', precision)})`,
	[FactorType.BIZ_SCALE]: () => 'NUMBER(9)',

	[FactorType.BOOLEAN]: () => 'NUMBER(1)',

	[FactorType.ENUM]: (precision) => `VARCHAR2(${asPrecision('20', precision)})`,

	[FactorType.OBJECT]: () => 'CLOB',
	[FactorType.ARRAY]: () => 'CLOB'
};