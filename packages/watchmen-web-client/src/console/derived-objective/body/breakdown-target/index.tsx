import {BreakdownTarget, DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveTarget, ObjectiveTargetValues} from '@/services/data/tuples/objective-types';
import React from 'react';
import {BreakdownTargetData} from '../breakdown-target-data';
import {DefForBreakdownDimension} from '../types';
import {BreakdownTargetDimensions} from './breakdown-target-dimensions';
import {BreakdownTargetEventBusProvider} from './breakdown-target-event-bus';
import {BreakdownTargetTitle} from './breakdown-target-title';
import {BreakdownTargetContainer} from './widgets';

export const BreakdownTargetSection = (props: {
	derivedObjective: DerivedObjective;
	target: ObjectiveTarget; breakdown: BreakdownTarget; index: number; def: DefForBreakdownDimension;
	values: ObjectiveTargetValues
}) => {
	const {derivedObjective, target, index, def, breakdown} = props;

	return <BreakdownTargetEventBusProvider>
		<BreakdownTargetContainer data-on-share={true}>
			<BreakdownTargetTitle derivedObjective={derivedObjective} breakdown={breakdown} index={index}/>
			<BreakdownTargetDimensions derivedObjective={derivedObjective} target={target} breakdown={breakdown}
			                           def={def}/>
			<BreakdownTargetData derivedObjective={derivedObjective} target={target} breakdown={breakdown}
			                     def={def}/>
		</BreakdownTargetContainer>
	</BreakdownTargetEventBusProvider>;
};