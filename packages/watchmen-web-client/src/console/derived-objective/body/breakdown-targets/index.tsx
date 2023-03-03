import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveTarget, ObjectiveTargetValues} from '@/services/data/tuples/objective-types';
import {BreakdownTargetsContainer} from './widgets';

export const BreakdownTargets = (props: {
	derivedObjective: DerivedObjective; target: ObjectiveTarget; values?: ObjectiveTargetValues
}) => {
	return <BreakdownTargetsContainer>
	</BreakdownTargetsContainer>;
};