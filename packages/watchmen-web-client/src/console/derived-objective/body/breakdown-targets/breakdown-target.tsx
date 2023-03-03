import {BreakdownDimension, BreakdownTarget, DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveTarget, ObjectiveTargetValues} from '@/services/data/tuples/objective-types';
import {v4} from 'uuid';
import {BreakdownEventBusProvider} from './breakdown-event-bus';
import {BreakdownTargetDimensionRow} from './breakdown-target-dimension';
import {DefForBreakdownDimension} from './types';
import {BreakdownTargetContainer, BreakdownTargetData, BreakdownTargetDimensions} from './widgets';

export const BreakdownTargetSection = (props: {
	derivedObjective: DerivedObjective;
	target: ObjectiveTarget; breakdown: BreakdownTarget;
	def: DefForBreakdownDimension;
	values: ObjectiveTargetValues
}) => {
	const {derivedObjective, target, def, breakdown} = props;

	const dimensions = breakdown.dimensions ?? [];

	return <BreakdownEventBusProvider>
		<BreakdownTargetContainer>
			<BreakdownTargetDimensions>
				{dimensions.map(dimension => {
					return <BreakdownTargetDimensionRow derivedObjective={derivedObjective}
					                                    target={target} breakdown={breakdown}
					                                    dimension={dimension}
					                                    def={def}
					                                    key={v4()}/>;
				})}
				{/** add dimension */}
				<BreakdownTargetDimensionRow derivedObjective={derivedObjective}
				                             target={target} breakdown={breakdown}
				                             dimension={{} as BreakdownDimension}
				                             def={def}/>
			</BreakdownTargetDimensions>
			<BreakdownTargetData>

			</BreakdownTargetData>
		</BreakdownTargetContainer>
	</BreakdownEventBusProvider>;
};