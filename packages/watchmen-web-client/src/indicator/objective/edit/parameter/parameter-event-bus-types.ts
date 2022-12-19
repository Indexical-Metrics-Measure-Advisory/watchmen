import {
	ComputedObjectiveParameter,
	ConstantObjectiveParameter,
	ObjectiveParameter,
	ReferObjectiveParameter
} from '@/services/data/tuples/objective-types';

export enum ParameterEventTypes {
	/**
	 * any change will lead this event. no fire explicitly
	 */
	PARAM_CHANGED = 'param-changed',

	FROM_CHANGED = 'from-changed',

	CONDITION_CHANGED = 'condition-changed',

	CONSTANT_VALUE_CHANGED = 'constant-value-changed',

	FACTOR_CHANGED = 'factor-changed',

	COMPUTE_OPERATOR_CHANGED = 'compute-operator-changed',
	COMPUTE_CONTENT_CHANGED = 'compute-content-changed',

	COMPUTE_PARAMETER_ADDED = 'compute-parameter-added',
	COMPUTE_PARAMETER_REMOVED = 'compute-parameter-removed'
}

export interface ParameterEventBus {
	on(type: ParameterEventTypes.PARAM_CHANGED, listener: () => void): this;
	off(type: ParameterEventTypes.PARAM_CHANGED, listener: () => void): this;

	fire(type: ParameterEventTypes.FROM_CHANGED, parameter: ObjectiveParameter): this;
	on(type: ParameterEventTypes.FROM_CHANGED, listener: (parameter: ObjectiveParameter) => void): this;
	off(type: ParameterEventTypes.FROM_CHANGED, listener: (parameter: ObjectiveParameter) => void): this;

	fire(type: ParameterEventTypes.CONDITION_CHANGED, parameter: ObjectiveParameter): this;
	on(type: ParameterEventTypes.CONDITION_CHANGED, listener: (parameter: ObjectiveParameter) => void): this;
	off(type: ParameterEventTypes.CONDITION_CHANGED, listener: (parameter: ObjectiveParameter) => void): this;

	fire(type: ParameterEventTypes.CONSTANT_VALUE_CHANGED, parameter: ConstantObjectiveParameter): this;
	on(type: ParameterEventTypes.CONSTANT_VALUE_CHANGED, listener: (parameter: ConstantObjectiveParameter) => void): this;
	off(type: ParameterEventTypes.CONSTANT_VALUE_CHANGED, listener: (parameter: ConstantObjectiveParameter) => void): this;

	fire(type: ParameterEventTypes.FACTOR_CHANGED, parameter: ReferObjectiveParameter): this;
	on(type: ParameterEventTypes.FACTOR_CHANGED, listener: (parameter: ReferObjectiveParameter) => void): this;
	off(type: ParameterEventTypes.FACTOR_CHANGED, listener: (parameter: ReferObjectiveParameter) => void): this;

	fire(type: ParameterEventTypes.COMPUTE_OPERATOR_CHANGED, parameter: ComputedObjectiveParameter): this;
	on(type: ParameterEventTypes.COMPUTE_OPERATOR_CHANGED, listener: (parameter: ComputedObjectiveParameter) => void): this;
	off(type: ParameterEventTypes.COMPUTE_OPERATOR_CHANGED, listener: (parameter: ComputedObjectiveParameter) => void): this;

	fire(type: ParameterEventTypes.COMPUTE_CONTENT_CHANGED, parameter: ComputedObjectiveParameter): this;
	on(type: ParameterEventTypes.COMPUTE_CONTENT_CHANGED, listener: (parameter: ComputedObjectiveParameter) => void): this;
	off(type: ParameterEventTypes.COMPUTE_CONTENT_CHANGED, listener: (parameter: ComputedObjectiveParameter) => void): this;

	fire(type: ParameterEventTypes.COMPUTE_PARAMETER_ADDED, parameter: ComputedObjectiveParameter, added: ObjectiveParameter): this;
	on(type: ParameterEventTypes.COMPUTE_PARAMETER_ADDED, listener: (parameter: ComputedObjectiveParameter, added: ObjectiveParameter) => void): this;
	off(type: ParameterEventTypes.COMPUTE_PARAMETER_ADDED, listener: (parameter: ComputedObjectiveParameter, added: ObjectiveParameter) => void): this;

	fire(type: ParameterEventTypes.COMPUTE_PARAMETER_REMOVED, parameter: ComputedObjectiveParameter, removed: ObjectiveParameter): this;
	on(type: ParameterEventTypes.COMPUTE_PARAMETER_REMOVED, listener: (parameter: ComputedObjectiveParameter, removed: ObjectiveParameter) => void): this;
	off(type: ParameterEventTypes.COMPUTE_PARAMETER_REMOVED, listener: (parameter: ComputedObjectiveParameter, removed: ObjectiveParameter) => void): this;
}