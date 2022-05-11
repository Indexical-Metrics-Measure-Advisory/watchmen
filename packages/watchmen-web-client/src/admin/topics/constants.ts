import {FactorType} from '@/services/data/tuples/factor-types';

export const FactorPrecisions: Partial<{ [key in FactorType]: string }> = {
	[FactorType.NUMBER]: '32,6',
	[FactorType.UNSIGNED]: '32,6',
	[FactorType.TEXT]: '255',
	[FactorType.CONTINENT]: '10',
	[FactorType.REGION]: '10',
	[FactorType.COUNTRY]: '10',
	[FactorType.PROVINCE]: '10',
	[FactorType.CITY]: '10',
	[FactorType.DISTRICT]: '255',
	[FactorType.ROAD]: '255',
	[FactorType.COMMUNITY]: '100',
	[FactorType.RESIDENCE_TYPE]: '10',
	[FactorType.RESIDENTIAL_AREA]: '10,2',
	[FactorType.EMAIL]: '100',
	[FactorType.PHONE]: '50',
	[FactorType.MOBILE]: '50',
	[FactorType.FAX]: '50',
	[FactorType.GENDER]: '10',
	[FactorType.OCCUPATION]: '10',
	[FactorType.ID_NO]: '50',
	[FactorType.RELIGION]: '10',
	[FactorType.NATIONALITY]: '10',
	[FactorType.BIZ_TRADE]: '10',
	[FactorType.ENUM]: '20'
};