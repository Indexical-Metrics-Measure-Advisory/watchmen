import {BreakdownTarget, DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveTarget, ObjectiveTargetValues} from '@/services/data/tuples/objective-types';
import {noop} from '@/services/utils';
import {PageTitleEditor} from '@/widgets/basic/page-title-editor';
import {useForceUpdate} from '@/widgets/basic/utils';
import React from 'react';
import {useObjectiveEventBus} from '../../objective-event-bus';
import {ObjectiveEventTypes} from '../../objective-event-bus-types';
import {BreakdownTargetDimensionsSection} from './breakdown-target-dimensions';
import {BreakdownTargetEventBusProvider} from './breakdown-target-event-bus';
import {DefForBreakdownDimension} from './types';
import {BreakdownTargetContainer, BreakdownTargetData, BreakdownTargetTitleContainer} from './widgets';

const BreakdownTargetTitle = (props: {
	derivedObjective: DerivedObjective; breakdown: BreakdownTarget; index: number;
}) => {
	const {breakdown, index} = props;

	const {fire} = useObjectiveEventBus();
	const forceUpdate = useForceUpdate();

	const onNameChange = async (name: string) => {
		breakdown.name = name;
		forceUpdate();
		fire(ObjectiveEventTypes.SAVE, noop);
	};
	const onNameChangeComplete = async (name: string) => {
		breakdown.name = name.trim();
		forceUpdate();
		fire(ObjectiveEventTypes.SAVE, noop);
	};

	return <BreakdownTargetTitleContainer>
		<span>#{index + 1}</span>
		<PageTitleEditor title={breakdown.name || ''} defaultTitle=""
		                 onChange={onNameChange} onChangeComplete={onNameChangeComplete}/>
	</BreakdownTargetTitleContainer>;
};

export const BreakdownTargetSection = (props: {
	derivedObjective: DerivedObjective;
	target: ObjectiveTarget; breakdown: BreakdownTarget; index: number; def: DefForBreakdownDimension;
	values: ObjectiveTargetValues
}) => {
	const {derivedObjective, target, index, def, breakdown} = props;

	return <BreakdownTargetEventBusProvider>
		<BreakdownTargetContainer>
			<BreakdownTargetTitle derivedObjective={derivedObjective} breakdown={breakdown} index={index}/>
			<BreakdownTargetDimensionsSection derivedObjective={derivedObjective} target={target} breakdown={breakdown}
			                                  def={def}/>
			<BreakdownTargetData/>
		</BreakdownTargetContainer>
	</BreakdownTargetEventBusProvider>;
};