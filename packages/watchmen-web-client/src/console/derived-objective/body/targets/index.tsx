import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveTarget, ObjectiveTargetValues} from '@/services/data/tuples/objective-types';
import React from 'react';
import {Target} from '../target';
import {TargetEventBusProvider} from '../target/target-event-bus';
import {TargetsContainer} from './widgets';

export const Targets = (props: {
	derivedObjective: DerivedObjective;
	findTargetValues: (target: ObjectiveTarget) => ObjectiveTargetValues | undefined
}) => {
	const {derivedObjective, findTargetValues} = props;

	const {definition: objective} = derivedObjective;
	const targets: Array<ObjectiveTarget> = objective.targets || [];
	if (derivedObjective.breakdownTargets == null) {
		derivedObjective.breakdownTargets = [];
	}

	return <TargetsContainer>
		{targets.map((target, index) => {
			return <TargetEventBusProvider key={target.uuid}>
				<Target derivedObjective={derivedObjective} target={target} index={index + 1}
				        values={findTargetValues(target)}/>
			</TargetEventBusProvider>;
		})}
	</TargetsContainer>;
};