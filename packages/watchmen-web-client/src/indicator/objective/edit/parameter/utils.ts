import {
	ComputedObjectiveParameter,
	ConstantObjectiveParameter,
	ObjectiveFactorId,
	ObjectiveFormulaOperator,
	ObjectiveParameter,
	ObjectiveParameterType,
	ReferObjectiveParameter
} from '@/services/data/tuples/objective-types';

export const isReferParameter = (param: ObjectiveParameter): param is ReferObjectiveParameter => param.kind === ObjectiveParameterType.REFER;
export const isConstantParameter = (param: ObjectiveParameter): param is ConstantObjectiveParameter => param.kind === ObjectiveParameterType.CONSTANT;
export const isComputedParameter = (param: ObjectiveParameter): param is ComputedObjectiveParameter => param.kind === ObjectiveParameterType.COMPUTED;

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
	[ObjectiveFormulaOperator.INTERPOLATE]: {name: ObjectiveFormulaOperator.INTERPOLATE, parameterCount: 5},
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
			if (isConstantParameter(parameter.parameters[1])) {
				const value = parameter.parameters[1].value;
				if (!/\d/.test(value)) {
					(parameter.parameters[1] as ConstantObjectiveParameter).value = '0';
				}
			} else {
				parameter.parameters[1] = createConstantParameter('0');
			}
		} else if (ObjectiveFormulaOperator.INTERPOLATE === parameter.operator) {
			[1, 2, 3, 4].forEach(index => {
				if (!isConstantParameter(parameter.parameters[index])) {
					parameter.parameters[index] = createConstantParameter();
				}
			});
		}
	}
};

export const canAddMoreParameter = (parent: ComputedObjectiveParameter) => {
	const operator = parent.operator;
	const calculatorDef = ParameterFormulaDefsMap[operator];
	const maxParamCount = calculatorDef.maxParameterCount || calculatorDef.parameterCount || Infinity;
	const currentCount = parent.parameters.length;
	return currentCount < maxParamCount;
};

export const canDeleteAnyParameter = (parent: ComputedObjectiveParameter) => {
	const operator = parent.operator;
	const calculatorDef = ParameterFormulaDefsMap[operator];
	const minParamCount = calculatorDef.minParameterCount || calculatorDef.parameterCount || 1;
	const currentCount = parent.parameters.length;
	return currentCount > minParamCount;
};

export const defendParameterAndRemoveUnnecessary = (parameter: ObjectiveParameter) => {
	if (isReferParameter(parameter)) {
		const old = parameter as any;
		delete old.value;
		delete old.operator;
		delete old.parameters;
		parameter.uuid = parameter.uuid || '';
	} else if (isConstantParameter(parameter)) {
		const old = parameter as any;
		delete old.uuid;
		delete old.operator;
		delete old.parameters;
		parameter.value = parameter.value || '';
	} else if (isComputedParameter(parameter)) {
		const old = parameter as any;
		delete old.uuid;
		delete old.value;
		parameter.operator = parameter.operator || ObjectiveFormulaOperator.ADD;
		parameter.parameters = old.parameters || [createFactorParameter(), createFactorParameter()];
	}
};
