import {
	BucketObjectiveParameter,
	CaseThenObjectiveParameter,
	ComputedObjectiveParameter,
	ConstantObjectiveParameter,
	ObjectiveFactor,
	ObjectiveFactorKind,
	ObjectiveFactorOnComputation,
	ObjectiveFactorOnIndicator,
	ObjectiveFormulaOperator,
	ObjectiveParameter,
	ObjectiveParameterCondition,
	ObjectiveParameterExpression,
	ObjectiveParameterJoint,
	ObjectiveParameterType,
	ObjectiveVariable,
	ObjectiveVariableKind,
	ObjectiveVariableOnBucket,
	ObjectiveVariableOnRange,
	ObjectiveVariableOnValue,
	ReferObjectiveParameter,
	TimeFrameObjectiveParameter
} from './objective-types';

export const isIndicatorFactor = (factor: ObjectiveFactor): factor is ObjectiveFactorOnIndicator => factor.kind === ObjectiveFactorKind.INDICATOR;
export const isComputedFactor = (factor: ObjectiveFactor): factor is ObjectiveFactorOnComputation => factor.kind === ObjectiveFactorKind.COMPUTED;
export const isValueVariable = (variable: ObjectiveVariable): variable is ObjectiveVariableOnValue => variable.kind === ObjectiveVariableKind.SINGLE_VALUE;
export const isRangeVariable = (variable: ObjectiveVariable): variable is ObjectiveVariableOnRange => variable.kind === ObjectiveVariableKind.RANGE;
export const isBucketVariable = (variable: ObjectiveVariable): variable is ObjectiveVariableOnBucket => variable.kind === ObjectiveVariableKind.BUCKET;

export const isReferParameter = (param: ObjectiveParameter): param is ReferObjectiveParameter => param.kind === ObjectiveParameterType.REFER;
export const isConstantParameter = (param: ObjectiveParameter): param is ConstantObjectiveParameter => param.kind === ObjectiveParameterType.CONSTANT;
export const isComputedParameter = (param: ObjectiveParameter): param is ComputedObjectiveParameter => param.kind === ObjectiveParameterType.COMPUTED;
export const isCaseThenParameter = (param: ObjectiveParameter): param is CaseThenObjectiveParameter => isComputedParameter(param) && param.operator === ObjectiveFormulaOperator.CASE_THEN;
export const isBucketParameter = (param: ObjectiveParameter): param is BucketObjectiveParameter => param.kind === ObjectiveParameterType.BUCKET;
export const isTimeFrameParameter = (param: ObjectiveParameter): param is TimeFrameObjectiveParameter => param.kind === ObjectiveParameterType.TIME_FRAME;

export const isJointParameter = (condition: ObjectiveParameterCondition): condition is ObjectiveParameterJoint => {
	return !!(condition as any).conj;
};
export const isExpressionParameter = (condition: ObjectiveParameterCondition): condition is ObjectiveParameterExpression => {
	return !isJointParameter(condition);
};