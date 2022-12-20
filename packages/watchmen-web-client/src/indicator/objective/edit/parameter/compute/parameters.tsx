import {
	ComputedObjectiveParameter,
	Objective,
	ObjectiveFactor,
	ObjectiveFormulaOperator
} from '@/services/data/tuples/objective-types';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {v4} from 'uuid';
import {ParameterEventBusProvider} from '../parameter-event-bus';
import {SubParameterEditor} from '../sub-param';
import {SubParameterAdd} from '../sub-param/sub-parameter-add';
import {HierarchicalEventBridge} from './hierarchical-event-bridge';
import {useSubParameterChanged} from './use-computed-parameter';
import {ParametersContainer} from './widgets';

const isFromFixed = (parameter: ComputedObjectiveParameter, index: number): { fix: boolean, label?: string } => {
	if ([
		ObjectiveFormulaOperator.ROUND, ObjectiveFormulaOperator.FLOOR, ObjectiveFormulaOperator.CEIL
	].includes(parameter.operator) && index !== 0) {
		return {fix: true, label: Lang.PARAMETER.COMPUTE_TYPE.ROUND_DIGITS};
	} else if (parameter.operator === ObjectiveFormulaOperator.INTERPOLATE) {
		switch (index) {
			case 1:
				return {fix: true, label: Lang.PARAMETER.COMPUTE_TYPE.INTERPOLATE_MIN_VALUE};
			case 2:
				return {fix: true, label: Lang.PARAMETER.COMPUTE_TYPE.INTERPOLATE_MIN_VALUE_TO};
			case 3:
				return {fix: true, label: Lang.PARAMETER.COMPUTE_TYPE.INTERPOLATE_MAX_VALUE};
			case 4:
				return {fix: true, label: Lang.PARAMETER.COMPUTE_TYPE.INTERPOLATE_MAX_VALUE_TO};
			case 0:
			default:
				return {fix: false};
		}
	} else {
		return {fix: false};
	}
};

export const Parameters = (props: {
	objective: Objective; parameter: ComputedObjectiveParameter; notifyChangeToParent: () => void;
	factors: Array<ObjectiveFactor>;
}) => {
	const {objective, parameter, notifyChangeToParent, factors} = props;

	const {onDeleted, onAdded} = useSubParameterChanged(parameter);

	return <ParametersContainer>
		{parameter.parameters.map((param, index) => {
			const {fix, label} = isFromFixed(parameter, index);
			return <ParameterEventBusProvider key={v4()}>
				<HierarchicalEventBridge notifyChangeToParent={notifyChangeToParent}/>
				<SubParameterEditor objective={objective}
				                    parent={parameter} parameter={param} onDeleted={onDeleted(param)}
				                    fixFrom={fix} fromLabel={label}
				                    factors={factors}/>
			</ParameterEventBusProvider>;
		})}
		<SubParameterAdd parent={parameter} onAdded={onAdded()}/>
	</ParametersContainer>;
};
