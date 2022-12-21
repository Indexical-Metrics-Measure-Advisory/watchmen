import {Indicator} from '@/services/data/tuples/indicator-types';
import {Objective, ObjectiveFactorOnIndicator} from '@/services/data/tuples/objective-types';
import {noop} from '@/services/utils';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {useObjectivesEventBus} from '../../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../../objectives-event-bus-types';
import {JointEventBusProvider} from './event-bus/joint-event-bus';
import {FilterChangeHandler} from './filter-change-handler';
import {FilterEventBusProvider} from './filter-event-bus';
import {TopFold} from './top-fold';
import {TopJoint2FilterBridge} from './top-joint-2-filter-bridge';
import {TopType} from './top-type';
import {FilterContainer, FilterHeader, IndicatorNotReady} from './widgets';

export const FactorFilter = (props: {
	objective: Objective; factor: ObjectiveFactorOnIndicator; indicator?: Indicator;
}) => {
	const {objective, factor, indicator} = props;

	const {fire} = useObjectivesEventBus();

	if (indicator == null) {
		return <FilterContainer>
			<IndicatorNotReady>{Lang.INDICATOR.OBJECTIVE.FACTOR_INDICATOR_NOT_READY}</IndicatorNotReady>
		</FilterContainer>;
	}

	const onChange = () => {
		fire(ObjectivesEventTypes.SAVE_OBJECTIVE, objective, noop);
	};

	return <FilterEventBusProvider>
		<FilterChangeHandler onChange={onChange}/>
		<JointEventBusProvider>
			<TopJoint2FilterBridge factor={factor}/>
			<FilterContainer>
				<FilterHeader>
					<TopType factor={factor}/>
					<TopFold factor={factor}/>
				</FilterHeader>
				{/*<TopJoint objective={objective} conditional={conditional} factors={factors}/>*/}
			</FilterContainer>
		</JointEventBusProvider>
	</FilterEventBusProvider>;
};