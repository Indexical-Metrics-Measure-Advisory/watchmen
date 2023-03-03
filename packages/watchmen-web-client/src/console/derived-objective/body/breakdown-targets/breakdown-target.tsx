import {BreakdownTarget, DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveTarget, ObjectiveTargetValues} from '@/services/data/tuples/objective-types';
import React from 'react';
import {BreakdownEventBusProvider} from './breakdown-event-bus';
import {BreakdownTargetDimensionsSection} from './breakdown-target-dimensions';
import {DefForBreakdownDimension} from './types';
import {BreakdownTargetContainer, BreakdownTargetData} from './widgets';

export const BreakdownTargetSection = (props: {
	derivedObjective: DerivedObjective;
	target: ObjectiveTarget; breakdown: BreakdownTarget;
	def: DefForBreakdownDimension;
	values: ObjectiveTargetValues
}) => {
	const {derivedObjective, target, def, breakdown} = props;

	return <BreakdownEventBusProvider>
		<BreakdownTargetContainer>
			<BreakdownTargetDimensionsSection derivedObjective={derivedObjective} target={target} breakdown={breakdown}
			                                  def={def}/>
			<BreakdownTargetData>

			</BreakdownTargetData>
		</BreakdownTargetContainer>
	</BreakdownEventBusProvider>;
};