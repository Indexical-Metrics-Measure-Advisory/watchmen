import {BreakdownDimension, BreakdownTarget, DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveTarget} from '@/services/data/tuples/objective-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {v4} from 'uuid';
import {BreakdownTargetDimensionRow} from './breakdown-target-dimension';
import {DefForBreakdownDimension} from './types';
import {BreakdownTargetDimensions} from './widgets';

export const BreakdownTargetDimensionsSection = (props: {
	derivedObjective: DerivedObjective;
	target: ObjectiveTarget; breakdown: BreakdownTarget;
	def: DefForBreakdownDimension;
}) => {
	const {derivedObjective, target, def, breakdown} = props;

	const forceUpdate = useForceUpdate();

	const onAdded = () => forceUpdate();
	const onRemoved = () => forceUpdate();

	const dimensions = breakdown.dimensions ?? [];

	return <BreakdownTargetDimensions>
		{dimensions.map(dimension => {
			return <BreakdownTargetDimensionRow derivedObjective={derivedObjective}
			                                    target={target} breakdown={breakdown} dimension={dimension}
			                                    def={def} onAdded={onAdded} onRemoved={onRemoved}
			                                    key={v4()}/>;
		})}
		{/** add dimension */}
		<BreakdownTargetDimensionRow derivedObjective={derivedObjective}
		                             target={target} breakdown={breakdown} dimension={{} as BreakdownDimension}
		                             def={def} onAdded={onAdded} onRemoved={onRemoved}/>
	</BreakdownTargetDimensions>;
};