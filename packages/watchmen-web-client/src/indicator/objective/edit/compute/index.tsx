import {ComputedObjectiveParameter, Objective} from '@/services/data/tuples/objective-types';
import {FormulaOperatorEditor} from './formula-operator';
import {ComputationContainer} from './widgets';

export const Computation = (props: {
	objective: Objective;
	get: () => ComputedObjectiveParameter;
	set: (parameter: ComputedObjectiveParameter) => void;
}) => {
	const {objective, get} = props;

	const parameter = get();

	return <ComputationContainer>
		<FormulaOperatorEditor objective={objective} parameter={parameter}/>
	</ComputationContainer>;
};