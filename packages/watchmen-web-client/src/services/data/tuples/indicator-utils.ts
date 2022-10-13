import {isNotNull} from '../utils';
import {ParameterComputeType} from './factor-calculator-types';
import {getFactorType, isDateDiffConstant, isIndicatorFactor} from './factor-calculator-utils';
import {Factor, FactorId, FactorType} from './factor-types';
import {IndicatorMeasure, MeasureMethod} from './indicator-types';
import {isComputedParameter, isConstantParameter, isTopicFactorParameter} from './parameter-utils';
import {SubjectForIndicator, TopicForIndicator} from './query-indicator-types';
import {SubjectDataSetColumn, SubjectDataSetColumnId} from './subject-types';
import {Topic} from './topic-types';

export const tryToTransformToMeasure = (factorOrType: Factor | FactorType): Array<MeasureMethod> | MeasureMethod | undefined => {
	switch (getFactorType(factorOrType)) {
		case FactorType.CONTINENT:
			return MeasureMethod.CONTINENT;
		case FactorType.REGION:
			return MeasureMethod.REGION;
		case FactorType.COUNTRY:
			return MeasureMethod.COUNTRY;
		case FactorType.PROVINCE:
			return MeasureMethod.PROVINCE;
		case FactorType.CITY:
			return MeasureMethod.CITY;
		case FactorType.DISTRICT:
			return MeasureMethod.DISTRICT;
		case FactorType.FLOOR:
			return MeasureMethod.FLOOR;
		case FactorType.RESIDENCE_TYPE:
			return MeasureMethod.RESIDENCE_TYPE;
		case FactorType.RESIDENTIAL_AREA:
			return MeasureMethod.RESIDENTIAL_AREA;

		case FactorType.DATETIME:
			return [MeasureMethod.YEAR, MeasureMethod.MONTH];
		case FactorType.FULL_DATETIME:
			return [MeasureMethod.YEAR, MeasureMethod.MONTH];
		case FactorType.DATE:
			return [MeasureMethod.YEAR, MeasureMethod.MONTH];
		case FactorType.TIME:
			return MeasureMethod.HOUR;
		case FactorType.YEAR:
			return MeasureMethod.YEAR;
		case FactorType.HALF_YEAR:
			return MeasureMethod.HALF_YEAR;
		case FactorType.QUARTER:
			return MeasureMethod.QUARTER;
		case FactorType.MONTH:
			return MeasureMethod.MONTH;
		case FactorType.HALF_MONTH:
			return MeasureMethod.HALF_MONTH;
		case FactorType.TEN_DAYS:
			return MeasureMethod.TEN_DAYS;
		case FactorType.WEEK_OF_YEAR:
			return MeasureMethod.WEEK_OF_YEAR;
		case FactorType.WEEK_OF_MONTH:
			return MeasureMethod.WEEK_OF_MONTH;
		case FactorType.HALF_WEEK:
			return MeasureMethod.HALF_WEEK;
		case FactorType.DAY_OF_MONTH:
			return MeasureMethod.DAY_OF_MONTH;
		case FactorType.DAY_OF_WEEK:
			return MeasureMethod.DAY_OF_WEEK;
		case FactorType.DAY_KIND:
			return MeasureMethod.DAY_KIND;
		case FactorType.HOUR:
			return MeasureMethod.HOUR;
		case FactorType.HOUR_KIND:
			return MeasureMethod.HOUR_KIND;
		case FactorType.AM_PM:
			return MeasureMethod.AM_PM;

		case FactorType.GENDER:
			return MeasureMethod.GENDER;
		case FactorType.OCCUPATION:
			return MeasureMethod.OCCUPATION;
		case FactorType.DATE_OF_BIRTH:
			return [MeasureMethod.YEAR, MeasureMethod.MONTH];
		case FactorType.AGE:
			return MeasureMethod.AGE;
		case FactorType.RELIGION:
			return MeasureMethod.RELIGION;
		case FactorType.NATIONALITY:
			return MeasureMethod.NATIONALITY;
		case FactorType.BIZ_TRADE:
			return MeasureMethod.BIZ_TRADE;
		case FactorType.BIZ_SCALE:
			return MeasureMethod.BIZ_SCALE;
		case FactorType.BOOLEAN:
			return MeasureMethod.BOOLEAN;
		case FactorType.ENUM:
			return MeasureMethod.ENUM;

		case FactorType.SEQUENCE:
		case FactorType.NUMBER:
		case FactorType.UNSIGNED:
		case FactorType.TEXT:
		case FactorType.ADDRESS:
		case FactorType.ROAD:
		case FactorType.COMMUNITY:
		case FactorType.EMAIL:
		case FactorType.PHONE:
		case FactorType.MOBILE:
		case FactorType.FAX:
		case FactorType.MINUTE:
		case FactorType.SECOND:
		case FactorType.MILLISECOND:
		case FactorType.ID_NO:
		case FactorType.OBJECT:
		case FactorType.ARRAY:
			return (void 0);
	}
};

export const tryToTransformToMeasures = (factorOrType: Factor | FactorType): Array<MeasureMethod> => {
	const result = tryToTransformToMeasure(factorOrType);
	if (result == null) {
		return [];
	} else if (Array.isArray(result)) {
		return result;
	} else {
		return [result];
	}
};

export const tryToTransformColumnToMeasures = (column: SubjectDataSetColumn, subject: SubjectForIndicator): Array<MeasureMethod> => {
	if (isTopicFactorParameter(column.parameter)) {
		const {factor} = findTopicAndFactor(column, subject);
		if (factor == null) {
			return [];
		} else {
			return tryToTransformToMeasures(factor.type);
		}
	} else if (isComputedParameter(column.parameter)) {
		const factorType = translateComputeTypeToFactorType(column.parameter.type);
		if (factorType == null) {
			return [];
		} else {
			return tryToTransformToMeasures(factorType);
		}
	} else {
		// constant value cannot be measured
		return [];
	}
};

const factorToIndicatorMeasures = (factorOrColumnId: FactorId | SubjectDataSetColumnId, factorType: FactorType, accept?: (measure: MeasureMethod) => boolean): Array<IndicatorMeasure> | null => {
	const measures = tryToTransformToMeasure(factorType);
	if (measures == null) {
		// ignore
		return null;
	} else if (Array.isArray(measures)) {
		return measures.map(measure => {
			if (accept == null || accept(measure)) {
				return {factorOrColumnId, method: measure};
			} else {
				return null;
			}
		}).filter(isNotNull);
	} else if (accept == null || accept(measures)) {
		return [{factorOrColumnId, method: measures}];
	} else {
		return null;
	}
};

export const translateComputeTypeToFactorType = (computeType: ParameterComputeType): FactorType | null => {
	if (computeType === ParameterComputeType.YEAR_OF) {
		return FactorType.YEAR;
	} else if (computeType === ParameterComputeType.HALF_YEAR_OF) {
		return FactorType.HALF_YEAR;
	} else if (computeType === ParameterComputeType.QUARTER_OF) {
		return FactorType.QUARTER;
	} else if (computeType === ParameterComputeType.MONTH_OF) {
		return FactorType.MONTH;
	} else if (computeType === ParameterComputeType.WEEK_OF_YEAR) {
		return FactorType.WEEK_OF_YEAR;
	} else if (computeType === ParameterComputeType.WEEK_OF_MONTH) {
		return FactorType.WEEK_OF_MONTH;
	} else if (computeType === ParameterComputeType.DAY_OF_MONTH) {
		return FactorType.DAY_OF_MONTH;
	} else if (computeType === ParameterComputeType.DAY_OF_WEEK) {
		return FactorType.DAY_OF_WEEK;
	} else {
		// TODO case then is ignored now
		return null;
	}
};

export const detectMeasures = (topicOrSubject?: Topic | TopicForIndicator | SubjectForIndicator, accept?: (measure: MeasureMethod) => boolean): Array<IndicatorMeasure> => {
	if (topicOrSubject == null) {
		return [];
	}

	const isSubject = (topicOrSubject: Topic | TopicForIndicator | SubjectForIndicator): topicOrSubject is SubjectForIndicator => {
		return (topicOrSubject as any).subjectId != null;
	};

	if (isSubject(topicOrSubject)) {
		return (topicOrSubject.dataset.columns || []).map(column => {
			const parameter = column.parameter;
			if (isTopicFactorParameter(parameter)) {
				const {factor} = findTopicAndFactor(column, topicOrSubject);
				if (factor != null) {
					return factorToIndicatorMeasures(column.columnId, factor.type, accept);
				} else {
					return null;
				}
			} else if (isComputedParameter(parameter)) {
				const factorType = translateComputeTypeToFactorType(parameter.type);
				if (factorType != null) {
					return factorToIndicatorMeasures(column.columnId, factorType, accept);
				} else {
					return null;
				}
			} else {
				// constant value cannot be measured
				return null;
			}
		}).filter(isNotNull).flat();
	} else {
		return (topicOrSubject.factors || []).map(factor => {
			return factorToIndicatorMeasures(factor.factorId, factor.type, accept);
		}).filter(isNotNull).flat();
	}
};

export const isGeoMeasure = (measure: MeasureMethod): boolean => {
	return [
		MeasureMethod.CONTINENT, MeasureMethod.REGION, MeasureMethod.COUNTRY, MeasureMethod.PROVINCE,
		MeasureMethod.CITY, MeasureMethod.DISTRICT,
		MeasureMethod.FLOOR, MeasureMethod.RESIDENCE_TYPE, MeasureMethod.RESIDENTIAL_AREA
	].includes(measure);
};

export type TimePeriodMeasure =
	MeasureMethod.YEAR
	| MeasureMethod.HALF_YEAR
	| MeasureMethod.QUARTER
	| MeasureMethod.MONTH
	| MeasureMethod.HALF_MONTH
	| MeasureMethod.TEN_DAYS
	| MeasureMethod.WEEK_OF_YEAR
	| MeasureMethod.WEEK_OF_MONTH
	| MeasureMethod.HALF_WEEK
	| MeasureMethod.DAY_OF_MONTH
	| MeasureMethod.DAY_OF_WEEK
	| MeasureMethod.DAY_KIND
	| MeasureMethod.HOUR
	| MeasureMethod.HOUR_KIND
	| MeasureMethod.AM_PM;
export const isTimePeriodMeasure = (measure: MeasureMethod): measure is TimePeriodMeasure => {
	return [
		MeasureMethod.YEAR, MeasureMethod.HALF_YEAR, MeasureMethod.QUARTER, MeasureMethod.MONTH, MeasureMethod.HALF_MONTH,
		MeasureMethod.TEN_DAYS, MeasureMethod.WEEK_OF_YEAR, MeasureMethod.WEEK_OF_MONTH, MeasureMethod.HALF_WEEK,
		MeasureMethod.DAY_OF_MONTH, MeasureMethod.DAY_OF_WEEK, MeasureMethod.DAY_KIND,
		MeasureMethod.HOUR, MeasureMethod.HOUR_KIND, MeasureMethod.AM_PM
	].includes(measure);
};

export const isIndividualMeasure = (measure: MeasureMethod): boolean => {
	return [
		MeasureMethod.GENDER, MeasureMethod.OCCUPATION, MeasureMethod.AGE,
		MeasureMethod.RELIGION, MeasureMethod.NATIONALITY
	].includes(measure);
};

export const isOrganizationMeasure = (measure: MeasureMethod): boolean => {
	return [MeasureMethod.BIZ_TRADE, MeasureMethod.BIZ_SCALE].includes(measure);
};

export const isCategoryMeasure = (measure: MeasureMethod): boolean => {
	return [MeasureMethod.BOOLEAN, MeasureMethod.ENUM].includes(measure);
};

export const findTopicAndFactor = (column: SubjectDataSetColumn, subject?: SubjectForIndicator): { topic?: Topic, factor?: Factor } => {
	if (subject == null) {
		return {};
	}

	const parameter = column.parameter;
	if (isTopicFactorParameter(parameter)) {
		const {topicId, factorId} = parameter;
		// eslint-disable-next-line
		const topic = (subject.topics || []).find(topic => topic.topicId == topicId);
		if (topic == null) {
			return {};
		}
		// eslint-disable-next-line
		const factor = (topic.factors || []).find(factor => factor.factorId == factorId);
		if (factor == null) {
			return {topic};
		} else {
			return {topic, factor};
		}
	} else {
		return {};
	}
};

export const isIndicatorColumn = (column: SubjectDataSetColumn, subject: SubjectForIndicator): boolean => {
	const parameter = column.parameter;
	if (isTopicFactorParameter(parameter)) {
		const {factor} = findTopicAndFactor(column, subject);
		if (factor != null) {
			return isIndicatorFactor(factor);
		} else {
			return false;
		}
	} else if (isComputedParameter(parameter)) {
		const computeType = parameter.type;
		return [
			ParameterComputeType.ADD,
			ParameterComputeType.SUBTRACT,
			ParameterComputeType.MULTIPLY,
			ParameterComputeType.DIVIDE,
			ParameterComputeType.MODULUS
		].includes(computeType);
	} else if (isConstantParameter(parameter)) {
		const segments = (parameter.value || '').match(/([^{]*({[^}]+})?)/g);
		if (segments == null || segments.length !== 1) {
			return false;
		} else {
			const name = segments[0].substring(1, segments[0].length - 1).trim();
			return isDateDiffConstant(name).is;
		}
	} else {
		return false;
	}
};
