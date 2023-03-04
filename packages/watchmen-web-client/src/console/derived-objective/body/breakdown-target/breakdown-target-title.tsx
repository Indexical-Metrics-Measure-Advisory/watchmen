import {BreakdownTarget, DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {noop} from '@/services/utils';
import {PageTitleEditor} from '@/widgets/basic/page-title-editor';
import {useForceUpdate} from '@/widgets/basic/utils';
import React from 'react';
import {useObjectiveEventBus} from '../../objective-event-bus';
import {ObjectiveEventTypes} from '../../objective-event-bus-types';
import {BreakdownTargetTitleContainer} from './widgets';

export const BreakdownTargetTitle = (props: {
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