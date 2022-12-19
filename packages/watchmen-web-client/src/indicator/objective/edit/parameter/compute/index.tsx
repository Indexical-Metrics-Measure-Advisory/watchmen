import {ComputedObjectiveParameter, Objective, ObjectiveParameter} from '@/services/data/tuples/objective-types';
import {useParameterFromChanged} from '../use-parameter-from-changed';
import {isComputedParameter} from '../utils';
import {FormulaOperatorEditor} from './formula-operator';
import {Parameters} from './parameters';
import {useDelegateComputedParameterChildChangedToMe} from './use-computed-parameter';
import {ComputationContainer} from './widgets';

const ParametersEditor = (props: {
	objective: Objective;
	parameter: ComputedObjectiveParameter;
}) => {
	const {objective, parameter} = props;

	const notifyChangeToParent = useDelegateComputedParameterChildChangedToMe(parameter);

	return <Parameters objective={objective} parameter={parameter} notifyChangeToParent={notifyChangeToParent}/>;
};
export const ComputedEditor = (props: {
	objective: Objective;
	parameter: ObjectiveParameter;
}) => {
	const {objective, parameter} = props;

	useParameterFromChanged();

	if (!isComputedParameter(parameter)) {
		return null;
	}

	return <ComputationContainer>
		<FormulaOperatorEditor objective={objective} parameter={parameter}/>
		<ParametersEditor objective={objective} parameter={parameter}/>
	</ComputationContainer>;
};