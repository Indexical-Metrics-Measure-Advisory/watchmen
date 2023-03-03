import {Indicator} from '@/services/data/tuples/indicator-types';
import {
	ComputedObjectiveParameter,
	Objective,
	ObjectiveFactorOnIndicator,
	ObjectiveFormulaOperator,
	ObjectiveParameter
} from '@/services/data/tuples/objective-types';
import {isComputedParameter} from '@/services/data/tuples/objective-utils';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useEffect} from 'react';
import {useParameterEventBus} from '../parameter-event-bus';
import {ParameterEventTypes} from '../parameter-event-bus-types';
import {useParameterFromChanged} from '../use-parameter-from-changed';
import {FormulaOperatorEditor} from './formula-operator';
import {Parameters} from './parameters';
import {useDelegateComputedParameterChildChangedToMe} from './use-computed-parameter';
import {ComputationContainer} from './widgets';

const ParametersEditor = (props: {
	objective: Objective; factor: ObjectiveFactorOnIndicator; indicator: Indicator;
	parameter: ComputedObjectiveParameter;
}) => {
	const {objective, factor, indicator, parameter} = props;

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

	return <Parameters objective={objective} factor={factor} indicator={indicator}
	                   parameter={parameter} notifyChangeToParent={notifyChangeToParent}/>;
};
export const ComputedEditor = (props: {
	objective: Objective; factor: ObjectiveFactorOnIndicator; indicator: Indicator;
	parameter: ObjectiveParameter;
}) => {
	const {objective, factor, indicator, parameter} = props;

	useParameterFromChanged();

	if (!isComputedParameter(parameter)) {
		return null;
	}

	return <ComputationContainer>
		<FormulaOperatorEditor objective={objective} parameter={parameter}/>
		<ParametersEditor objective={objective} factor={factor} indicator={indicator} parameter={parameter}/>
	</ComputationContainer>;
};