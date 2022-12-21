import {
	ComputedObjectiveParameter,
	Objective,
	ObjectiveFactor,
	ObjectiveFormulaOperator,
	ObjectiveParameter
} from '@/services/data/tuples/objective-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useEffect} from 'react';
import {isComputedParameter} from '../../param-utils';
import {useParameterEventBus} from '../parameter-event-bus';
import {ParameterEventTypes} from '../parameter-event-bus-types';
import {useParameterFromChanged} from '../use-parameter-from-changed';
import {FormulaOperatorEditor} from './formula-operator';
import {Parameters} from './parameters';
import {useDelegateComputedParameterChildChangedToMe} from './use-computed-parameter';
import {ComputationContainer} from './widgets';

const ParametersEditor = (props: {
	objective: Objective; parameter: ComputedObjectiveParameter; factors: Array<ObjectiveFactor>;
}) => {
	const {objective, parameter, factors} = props;

	const {on, off} = useParameterEventBus();
	const notifyChangeToParent = useDelegateComputedParameterChildChangedToMe(parameter);
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onOperatorChanged = (param: ComputedObjectiveParameter) => {
			if (param !== parameter) {
				return;
			}
			forceUpdate();
		};
		on(ParameterEventTypes.COMPUTE_OPERATOR_CHANGED, onOperatorChanged);
		return () => {
			off(ParameterEventTypes.COMPUTE_OPERATOR_CHANGED, onOperatorChanged);
		};
	}, [on, off, forceUpdate, parameter]);

	if (parameter.operator === ObjectiveFormulaOperator.NONE) {
		return null;
	}

	return <Parameters objective={objective} parameter={parameter} notifyChangeToParent={notifyChangeToParent}
	                   factors={factors}/>;
};
export const ComputedEditor = (props: {
	objective: Objective; parameter: ObjectiveParameter; factors: Array<ObjectiveFactor>;
	hasAsIs?: boolean;
}) => {
	const {objective, parameter, factors, hasAsIs = false} = props;

	useParameterFromChanged();

	if (!isComputedParameter(parameter)) {
		return null;
	}

	return <ComputationContainer>
		<FormulaOperatorEditor objective={objective} parameter={parameter} hasAsIs={hasAsIs}/>
		<ParametersEditor objective={objective} parameter={parameter} factors={factors}/>
	</ComputationContainer>;
};