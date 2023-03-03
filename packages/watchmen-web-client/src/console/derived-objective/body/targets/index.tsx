import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveTarget, ObjectiveTargetValues} from '@/services/data/tuples/objective-types';
import React from 'react';
import {Target} from './target';
import {TargetsContainer} from './widgets';

export const Targets = (props: {
	derivedObjective: DerivedObjective;
	findTargetValues: (target: ObjectiveTarget) => ObjectiveTargetValues | undefined
}) => {
	const {derivedObjective, findTargetValues} = props;

	const {definition: objective} = derivedObjective;
	const targets: Array<ObjectiveTarget> = objective.targets || [];

	return <TargetsContainer>
		{targets.map((target, index) => {
			return <Target derivedObjective={derivedObjective} target={target} index={index + 1}
			               values={findTargetValues(target)}
			               key={target.uuid}/>;
		})}
	</TargetsContainer>;
};