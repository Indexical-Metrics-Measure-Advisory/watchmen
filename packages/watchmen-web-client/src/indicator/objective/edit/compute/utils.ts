import {
	ComputedObjectiveParameter,
	ConstantObjectiveParameter,
	ObjectiveFactorId,
	ObjectiveFormulaOperator,
	ObjectiveParameterType,
	ReferObjectiveParameter
} from '@/services/data/tuples/objective-types';

export interface ParameterFormulaDef {
	/**
	 * calculator name
	 */
	name: ObjectiveFormulaOperator;
	/**
	 * how many parameters this calculator accepted
	 */
	parameterCount?: number;
	minParameterCount?: number;
	maxParameterCount?: number;
}

export const ParameterFormulaDefsMap: Record<ObjectiveFormulaOperator, ParameterFormulaDef> = {
	[ObjectiveFormulaOperator.NONE]: {name: ObjectiveFormulaOperator.NONE, parameterCount: 1},
	[ObjectiveFormulaOperator.ADD]: {name: ObjectiveFormulaOperator.ADD, minParameterCount: 2},
	[ObjectiveFormulaOperator.SUBTRACT]: {name: ObjectiveFormulaOperator.SUBTRACT, minParameterCount: 2},
	[ObjectiveFormulaOperator.MULTIPLY]: {name: ObjectiveFormulaOperator.MULTIPLY, minParameterCount: 2},
	[ObjectiveFormulaOperator.DIVIDE]: {name: ObjectiveFormulaOperator.DIVIDE, minParameterCount: 2},
	[ObjectiveFormulaOperator.ROUND]: {name: ObjectiveFormulaOperator.ROUND, parameterCount: 2},
	[ObjectiveFormulaOperator.FLOOR]: {name: ObjectiveFormulaOperator.FLOOR, parameterCount: 2},
	[ObjectiveFormulaOperator.CEIL]: {name: ObjectiveFormulaOperator.CEIL, parameterCount: 2},
	[ObjectiveFormulaOperator.ABS]: {name: ObjectiveFormulaOperator.ABS, parameterCount: 1},
	[ObjectiveFormulaOperator.MAX]: {name: ObjectiveFormulaOperator.MAX, minParameterCount: 1},
	[ObjectiveFormulaOperator.MIN]: {name: ObjectiveFormulaOperator.MIN, minParameterCount: 1},
	[ObjectiveFormulaOperator.INTERPOLATE]: {name: ObjectiveFormulaOperator.INTERPOLATE, minParameterCount: 5},
	[ObjectiveFormulaOperator.CASE_THEN]: {name: ObjectiveFormulaOperator.CASE_THEN, minParameterCount: 1}
};

export const createFactorParameter = (uuid?: ObjectiveFactorId): ReferObjectiveParameter => {
	return {kind: ObjectiveParameterType.REFER, uuid: uuid || ''};
};
export const createConstantParameter = (value?: string): ConstantObjectiveParameter => {
	return {kind: ObjectiveParameterType.CONSTANT, value: value || ''};
};

export const defendFormulaParameter = (parameter: ComputedObjectiveParameter) => {
	parameter.operator = parameter.operator || ObjectiveFormulaOperator.ADD;
	const calculatorDef = ParameterFormulaDefsMap[parameter.operator];
	const maxParamCount = calculatorDef.maxParameterCount || calculatorDef.parameterCount || Infinity;
	if (parameter.parameters.length > maxParamCount) {
		parameter.parameters.length = maxParamCount;
	}
	const minParamCount = calculatorDef.minParameterCount || calculatorDef.parameterCount || 1;
	if (parameter.parameters.length < minParamCount) {
		const existingCount = parameter.parameters.length;
		new Array(minParamCount - existingCount).fill(1).forEach(() => {
			parameter.parameters.push(createFactorParameter());
		});
		if ([
			ObjectiveFormulaOperator.ROUND, ObjectiveFormulaOperator.FLOOR, ObjectiveFormulaOperator.CEIL
		].includes(parameter.operator)) {
			if (parameter.parameters[1].kind !== ObjectiveParameterType.CONSTANT) {
				parameter.parameters[1] = createConstantParameter('0');
			} else {
				const value = (parameter.parameters[1] as ConstantObjectiveParameter).value;
				if (!/\d/.test(value)) {
					(parameter.parameters[1] as ConstantObjectiveParameter).value = '0';
				}
			}
		}
	}
};
