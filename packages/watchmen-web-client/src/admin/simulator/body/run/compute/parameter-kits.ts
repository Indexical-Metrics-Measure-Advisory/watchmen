import {
	ComputedParameter,
	ConstantParameter,
	Parameter,
	ParameterComputeType,
	ParsedVariablePredefineFunctions,
	TopicFactorParameter,
	VariablePredefineFunctions
} from '@/services/data/tuples/factor-calculator-types';
import {
	isCombineDateTimeConstant,
	isDateDiffConstant,
	isDateFormatConstant,
	isMoveDateConstant
} from '@/services/data/tuples/factor-calculator-utils';
import {Factor, FactorType} from '@/services/data/tuples/factor-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {getCurrentTime} from '@/services/data/utils';
import {isXaNumber, moveDate, translate_date_format} from '@/services/utils';
import dayjs from 'dayjs';
import {DataRow} from '../../../types';
import {AllTopics} from '../types';
import {ParameterShouldBe} from './types';

export const readTopicFactorParameter = (options: {
	parameter: TopicFactorParameter,
	topics: AllTopics,
	validOrThrow: (topicId: String) => void
}): { topic: Topic, factor: Factor } => {
	const {parameter, topics, validOrThrow} = options;

	const topicId = parameter.topicId;
	if (!topicId || topicId.trim().length === 0) {
		throw new Error(`Topic id of parameter[${JSON.stringify(parameter)}] cannot be blank.`);
	}
	validOrThrow(topicId);
	const topic = topics[topicId];
	if (!topic) {
		throw new Error(`Topic[${topicId}] of parameter[${JSON.stringify(parameter)}] not found.`);
	}

	const factorId = parameter.factorId;
	if (!factorId || factorId.trim().length === 0) {
		throw new Error(`Factor id of parameter[${JSON.stringify(parameter)}] cannot be blank.`);
	}
	// eslint-disable-next-line
	const factor = topic.factors.find(factor => factor.factorId == factorId);
	if (!factor) {
		throw new Error(`Factor[${factorId}] of parameter[${JSON.stringify(parameter)}] not found.`);
	}

	return {topic, factor};
};

const returnAsArray = (factor: Factor, value: any) => {
	return factor.type === FactorType.ARRAY && value == null ? [] : value;
};
export const getValueFromSourceData = (factor: Factor, sourceData: DataRow): any => {
	const name = factor.name!;
	if (!name.includes('.')) {
		return returnAsArray(factor, sourceData[name]);
	} else {
		const parts = name.split('.');
		let source: any = sourceData;
		return parts.reduce((obj, part) => {
			if (obj == null) {
				return returnAsArray(factor, null);
			} else if (Array.isArray(obj)) {
				// the next level might be an array, flatten it.
				return obj.map(item => {
					if (typeof item === 'object') {
						return returnAsArray(factor, item[part]);
					} else {
						throw new Error(`Cannot retrieve data from ${source} by [${part}].`);
					}
				}).flat();
			} else if (typeof obj === 'object') {
				return returnAsArray(factor, obj[part]);
			} else {
				throw new Error(`Cannot retrieve data from ${source} by [${part}].`);
			}
		}, source);
	}
};

const computeToCollection = (value?: any): Array<any> => {
	switch (true) {
		case value == null:
			return [];
		case Array.isArray(value):
			return value;
		case typeof value === 'string':
			return value.split(',').map((s: string) => s.trim());
		default:
			return [value];
	}
};

const computeToNumeric = (parameter: Parameter, value?: any): number | null => {
	if (value == null) {
		return value;
	} else if (!isXaNumber(value)) {
		throw new Error(`Cannot cast given value[${value}] to numeric, which is computed by parameter[${JSON.stringify(parameter)}].`);
	} else {
		return Number(value.toString());
	}
};

export const computeToDate = (parameter: Parameter, date?: any): string | null => {
	if (date == null) {
		return null;
	}

	date = date.toString().split('').map((c: string) => ' -/:.TZ'.includes(c) ? '' : c).join('');
	const casted = dayjs(date);
	if (casted.isValid()) {
		// remove time
		return casted.startOf('day').format('YYYYMMDD');
	} else {
		throw new Error(`Cannot cast given value[${date}] to date, which is computed by parameter[${JSON.stringify(parameter)}].`);
	}
};

export const castParameterValueType = (options: {
	value?: any,
	shouldBe: ParameterShouldBe,
	parameter: Parameter
}) => {
	const {value, shouldBe, parameter} = options;

	switch (shouldBe) {
		case ParameterShouldBe.ANY:
			return value;
		case ParameterShouldBe.COLLECTION:
			return computeToCollection(value);
		case ParameterShouldBe.NUMBER:
			return computeToNumeric(parameter, value);
		case ParameterShouldBe.DATE:
			return computeToDate(parameter, value);
	}
};

// use timestamp(13 digits) instead, just for simulator
let currentSnowflakeId = new Date().getTime();

const computeVariable = (options: {
	variable: string,
	getFirstValue: (propertyName: string) => any,
	throws: () => void
}): any => {
	const {variable, getFirstValue, throws} = options;
	if (variable.trim().length === 0) {
		return null;
	}

	const parsedFunction = [
		isDateDiffConstant, isMoveDateConstant, isDateFormatConstant, isCombineDateTimeConstant
	].reduce((ret: { is: boolean, parsed?: ParsedVariablePredefineFunctions }, parse) => {
		if (!ret.is) {
			return parse(variable);
		} else {
			return ret;
		}
	}, {is: false});
	if (parsedFunction.is) {
		const params = parsedFunction.parsed?.params.map(p => {
			return computeVariable({variable: p, getFirstValue, throws});
		}) || [];
		switch (parsedFunction.parsed?.f) {
			case VariablePredefineFunctions.YEAR_DIFF: {
				const [p1, p2] = params;
				return dayjs(p2).diff(p1, 'year');
			}
			case VariablePredefineFunctions.MONTH_DIFF: {
				const [p1, p2] = params;
				return dayjs(p2).diff(p1, 'month');
			}
			case VariablePredefineFunctions.DAY_DIFF: {
				const [p1, p2] = params;
				return dayjs(p2).diff(p1, 'day');
			}
			case VariablePredefineFunctions.MOVE_DATE: {
				const [p1, p2] = params;
				return moveDate(dayjs(p1), p2);
			}
			case VariablePredefineFunctions.DATE_FORMAT: {
				const [p1, p2] = params;
				return dayjs(p1).format(translate_date_format(p2));
			}
			case VariablePredefineFunctions.COMBINE_DATETIME: {
				const [p1, p2] = params;
				// tolerate SQL-literal style values, e.g. date'2024-03-21' or time'09:12:23'
				const normalize = (v: any): any => {
					return typeof v === 'string' ? v.trim().replace(/^[a-zA-Z]+'/, '').replace(/'$/, '') : v;
				};
				const datePart = dayjs(normalize(p1));
				const timeText = dayjs.isDayjs(p2) || p2 instanceof Date ? dayjs(p2).format('HH:mm:ss') : normalize(p2);
				const combined = dayjs(`${datePart.isValid() ? datePart.format('YYYY-MM-DD') : normalize(p1)} ${timeText}`);
				if (!combined.isValid()) {
					throws();
				}
				return combined;
			}
			default:
				throws();
		}
	}

	// eslint-disable-next-line
	return splitVariableParts(variable).reduce((value: any, part, index) => {
		if (index === 0 && part === VariablePredefineFunctions.NEXT_SEQ) {
			return currentSnowflakeId++;
		} else if (index === 0 && part === VariablePredefineFunctions.NOW) {
			return getCurrentTime();
		} else if (index === 0) {
			return getFirstValue(part);
		} else if (value == null) {
			return null;
		} else if (part === VariablePredefineFunctions.COUNT && Array.isArray(value)) {
			return value.length;
		} else if (part === VariablePredefineFunctions.COUNT && typeof value === 'object') {
			return Object.keys(value).length;
		} else if (part === VariablePredefineFunctions.SUM && Array.isArray(value)) {
			// eslint-disable-next-line
			return value.reduce((sum, v) => {
				if (v == null || v.toString().trim().length === 0) {
					return sum;
				}
				if (!isXaNumber(v)) {
					throws();
				} else {
					return sum + (v * 1);
				}
			}, 0);
        } else if (part === VariablePredefineFunctions.JOIN && Array.isArray(value)) {
            return Array.from(new Set(value)).join(',');
		} else if (part === VariablePredefineFunctions.MIN && Array.isArray(value)) {
			return typeAwareMin(value)
		} else if (part === VariablePredefineFunctions.MAX && Array.isArray(value)) {
			return typeAwareMax(value)
		} else if (part.startsWith(`${VariablePredefineFunctions.FIRST_ROW}(`) && part.endsWith(')')) {
			return computeFirstRow(value, part)
		} else if (part === VariablePredefineFunctions.LENGTH && typeof value === 'string') {
			return value.length;
		} else if (typeof value === 'object') {
			return value[part];
		} else if (Array.isArray(value)) {
			// eslint-disable-next-line
			return value.map(item => {
				if (typeof item === 'object') {
					return item[part];
				} else {
					throws();
				}
			}).flat();
		} else {
			throws();
		}
	}, null as any);
};
const computeStatement = (statement: string, getFirstValue: (propertyName: string) => any, throws: () => void): any => {
	const segments = statement.match(/([^{]*({[^}]+})?)/g);
	if (segments == null) {
		// no variable
		return statement;
	}
	const values = segments.filter(x => x).map(segment => {
		const braceStartIndex = segment.indexOf('{');
		if (braceStartIndex === -1) {
			return segment;
		} else if (braceStartIndex === 0) {
			const variable = segment.substring(1, segment.length - 1).trim();
			return computeVariable({variable, getFirstValue, throws});
		} else {
			const prefix = segment.substring(0, braceStartIndex);
			const variable = segment.substring(braceStartIndex + 1, segment.length - 1).trim();
			return `${prefix}${computeVariable({variable, getFirstValue, throws}) ?? ''}`;
		}
	});

	if (values.length === 1) {
		return values[0];
	} else {
		return values.filter(x => x != null).join('');
	}
};
export const computeConstantByStatement = (options: {
	statement: string,
	parameter: ConstantParameter,
	shouldBe: ParameterShouldBe,
	getValue: (propertyName: string) => any
}): any => {
	const {statement, parameter, shouldBe, getValue} = options;

	const value = computeStatement(statement, getValue, () => {
		throw new Error(`Cannot retrieve value of variable[${statement}], which is defined by parameter[${JSON.stringify(parameter)}].`);
	});
	return castParameterValueType({value, parameter, shouldBe});
};

const checkMinSubParameterCount = (parameter: ComputedParameter, count: number) => {
	const size = parameter.parameters.length;
	if (size < count) {
		throw new Error(`At least ${count} sub parameter(s) in [${JSON.stringify(parameter)}], but only [${size}] now.`);
	}
};
const checkMaxSubParameterCount = (parameter: ComputedParameter, count: number) => {
	const size = parameter.parameters.length;
	if (size > count) {
		throw new Error(`At most ${count} sub parameter(s) in [${JSON.stringify(parameter)}], but [${size}] now.`);
	}
};
export const checkSubParameters = (parameter: ComputedParameter) => {
	switch (parameter.type) {
		case ParameterComputeType.NONE:
			break;
		case        ParameterComputeType.ADD:
		case ParameterComputeType.SUBTRACT:
		case ParameterComputeType.MULTIPLY:
		case ParameterComputeType.DIVIDE:
			checkMinSubParameterCount(parameter, 2);
			break;
		case ParameterComputeType.MODULUS:
			checkMinSubParameterCount(parameter, 2);
			checkMaxSubParameterCount(parameter, 2);
			break;
		case ParameterComputeType.YEAR_OF:
		case ParameterComputeType.HALF_YEAR_OF:
		case ParameterComputeType.QUARTER_OF:
		case ParameterComputeType.MONTH_OF:
		case ParameterComputeType.WEEK_OF_YEAR:
		case ParameterComputeType.WEEK_OF_MONTH:
		case ParameterComputeType.DAY_OF_MONTH:
		case ParameterComputeType.DAY_OF_WEEK:
			checkMaxSubParameterCount(parameter, 1);
			break;
		case ParameterComputeType.CASE_THEN:
			checkMinSubParameterCount(parameter, 1);
			if (parameter.parameters.filter(sub => !sub.on).length > 1) {
				throw new Error(`Multiple anyway routes in case-then expression of [${JSON.stringify(parameter)}] is not allowed.`);
			}
	}
};
export const checkShouldBe = (parameter: ComputedParameter, shouldBe: ParameterShouldBe) => {
	const type = parameter.type;

	if (type === ParameterComputeType.NONE) {
	} else if (type === ParameterComputeType.CASE_THEN) {
	} else if (shouldBe === ParameterShouldBe.ANY) {
	} else if (shouldBe === ParameterShouldBe.COLLECTION) {
		// anything can be cast to collection,
		// collection is collection itself,
		// non-collection is the only element of collection
	} else if (shouldBe === ParameterShouldBe.DATE) {
		// cannot get date by computing except case-then
		throw new Error(`Cannot get date result on parameter[${JSON.stringify(parameter)}].`);
	} else if (shouldBe === ParameterShouldBe.NUMBER) {
	}
};

type Sortable = number | string | Date | boolean;

// Comparator function type
type Comparator<T> = (a: T, b: T) => number;

// Type judgment function
function getType(value: any): string {
  if (value instanceof Date) return 'date';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'unknown';
}

// Default comparator mapping
const defaultComparators: Record<string, Comparator<any>> = {
  number: (a: number, b: number) => a - b,
  string: (a: string, b: string) => a.localeCompare(b),
  date: (a: Date, b: Date) => a.getTime() - b.getTime(),
  boolean: (a: boolean, b: boolean) => (a === b ? 0 : a ? 1 : -1)
};

// Get the default comparator
function getDefaultComparator(type: string): Comparator<any> {
  const comparator = defaultComparators[type];
  if (!comparator) throw new Error(`Unsupported type: ${type}`);
  return comparator;
}

// Type-aware min function
function typeAwareMin<T extends Sortable>(array: T[], comparator?: Comparator<T>): T | undefined {
  if (array.length === 0) return undefined;

  const firstType = getType(array[0]);
  const allSameType = array.every(item => getType(item) === firstType);
  if (!allSameType) {
    throw new Error('Array contains mixed types, cannot determine min.');
  }

  const compareFn = comparator || getDefaultComparator(firstType);
  return array.reduce((min, current) =>
    compareFn(current, min) < 0 ? current : min, array[0]);
}

// Type-aware max function
function typeAwareMax<T extends Sortable>(array: T[], comparator?: Comparator<T>): T | undefined {
  if (array.length === 0) return undefined;

  const firstType = getType(array[0]);
  const allSameType = array.every(item => getType(item) === firstType);
  if (!allSameType) {
    throw new Error('Array contains mixed types, cannot determine max.');
  }

  const compareFn = comparator || getDefaultComparator(firstType);
  return array.reduce((max, current) =>
    compareFn(current, max) > 0 ? current : max, array[0]);
}

// split variable chain by dot, dots inside function parentheses
// (such as nested sort key path of &firstRow) are kept
const splitVariableParts = (variable: string): Array<string> => {
	const parts: Array<string> = [];
	let part = '';
	let depth = 0;
	for (const c of variable) {
		if (c === '(') {
			depth++;
		} else if (c === ')') {
			depth--;
		}
		if (c === '.' && depth === 0) {
			parts.push(part.trim());
			part = '';
		} else {
			part += c;
		}
	}
	parts.push(part.trim());
	return parts;
};

// parse sort keys of &firstRow, each key is "path[:asc|desc]", asc by default
const parseFirstRowSortKeys = (part: string): Array<{ path: Array<string>, desc: boolean }> => {
	const params = part.substring(part.indexOf('(') + 1, part.length - 1);
	return params.split(',').map(p => p.trim()).filter(p => p.length !== 0).map(p => {
		const [path, direction] = p.split(':').map(x => x.trim());
		return {path: path.split('.').map(x => x.trim()), desc: direction?.toLowerCase() === 'desc'};
	});
};

// retrieve value by nested path, null when any level is missing or not an object
const getFirstRowKeyValue = (row: any, path: Array<string>): any => {
	// eslint-disable-next-line
	return path.reduce((value, name) => {
		if (value != null && typeof value === 'object' && !Array.isArray(value)) {
			return value[name];
		} else {
			return null;
		}
	}, row);
};

// compare two non-null values, numeric strings are compared as numbers, others as strings
const compareFirstRowValues = (a: any, b: any): number => {
	if (isXaNumber(a) && isXaNumber(b)) {
		return Number(a) - Number(b);
	}
	return a.toString().localeCompare(b.toString());
};

// sort list of objects by given keys and return the first row,
// null when input is not a list, list is empty or any element is not an object
const computeFirstRow = (value: any, part: string): any => {
	if (!Array.isArray(value) || value.length === 0) {
		return null;
	}
	if (value.some(item => item == null || typeof item !== 'object' || Array.isArray(item))) {
		return null;
	}
	const sortKeys = parseFirstRowSortKeys(part);
	if (sortKeys.length === 0) {
		return value[0];
	}
	const sorted = [...value].sort((rowA, rowB) => {
		for (const {path, desc} of sortKeys) {
			const valueA = getFirstRowKeyValue(rowA, path);
			const valueB = getFirstRowKeyValue(rowB, path);
			// null is always last, no matter the sort direction
			if (valueA == null && valueB == null) {
				continue;
			} else if (valueA == null) {
				return 1;
			} else if (valueB == null) {
				return -1;
			}
			const ret = compareFirstRowValues(valueA, valueB);
			if (ret !== 0) {
				return desc ? -ret : ret;
			}
		}
		return 0;
	});
	return sorted[0];
};
