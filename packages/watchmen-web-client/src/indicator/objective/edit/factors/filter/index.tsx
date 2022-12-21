import {Indicator} from '@/services/data/tuples/indicator-types';
import {Objective, ObjectiveFactorOnIndicator} from '@/services/data/tuples/objective-types';
import {noop} from '@/services/utils';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {useObjectivesEventBus} from '../../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../../objectives-event-bus-types';
import {FilterChangeHandler} from './filter-change-handler';
import {FilterEventBusProvider} from './filter-event-bus';
import {FactorFilterContainer, IndicatorNotReady} from './widgets';

export const FactorFilter = (props: {
	objective: Objective; factor: ObjectiveFactorOnIndicator; indicator?: Indicator;
}) => {
	const {objective, factor, indicator} = props;

	const {fire} = useObjectivesEventBus();

	if (indicator == null) {
		return <FactorFilterContainer>
			<IndicatorNotReady>{Lang.INDICATOR.OBJECTIVE.FACTOR_INDICATOR_NOT_READY}</IndicatorNotReady>
		</FactorFilterContainer>;
	}

	const onChange = () => {
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
	};

	return <FilterEventBusProvider>
		<FilterChangeHandler onChange={onChange}/>
		{/*<JointEventBusProvider>*/}
		{/*	<TopJoint2ConditionalBridge conditional={conditional}/>*/}
		<FactorFilterContainer>
			{/*<ConditionalHeader>*/}
			{/*	<TopType conditional={conditional}/>*/}
			{/*	<TopFold conditional={conditional}/>*/}
			{/*</ConditionalHeader>*/}
			{/*<TopJoint objective={objective} conditional={conditional} factors={factors}/>*/}
		</FactorFilterContainer>
		{/*</JointEventBusProvider>*/}
	</FilterEventBusProvider>;
};