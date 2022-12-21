import {Indicator} from '@/services/data/tuples/indicator-types';
import {
	ConditionalObjectiveParameter,
	Objective,
	ObjectiveFactorOnIndicator
} from '@/services/data/tuples/objective-types';
import {Lang} from '@/widgets/langs';
import React from 'react';
import {JointEventBusProvider} from './event-bus/joint-event-bus';
import {FilterChangeHandler} from './filter-change-handler';
import {FilterEventBusProvider} from './filter-event-bus';
import {TopFold} from './top-fold';
import {TopJoint} from './top-joint';
import {TopJoint2ConditionalBridge} from './top-joint-2-conditional-bridge';
import {TopType} from './top-type';
import {FilterContainer, FilterHeader, IndicatorNotReady} from './widgets';

/**
 * on factor itself when no conditional passed
 */
export const ConditionalEditor = (props: {
	objective: Objective; factor: ObjectiveFactorOnIndicator; indicator?: Indicator;
	conditional?: ConditionalObjectiveParameter; onChange: () => void;
}) => {
	const {objective, factor, indicator, conditional, onChange} = props;

	if (indicator == null) {
		return <FilterContainer isTop={true}>
			<IndicatorNotReady>{Lang.INDICATOR.OBJECTIVE.FACTOR_INDICATOR_NOT_READY}</IndicatorNotReady>
		</FilterContainer>;
	}

	return <FilterEventBusProvider>
		<FilterChangeHandler onChange={onChange}/>
		<JointEventBusProvider>
			<TopJoint2ConditionalBridge factor={factor} conditional={conditional}/>
			<FilterContainer isTop={conditional == null}>
				<FilterHeader>
					<TopType factor={factor} conditional={conditional}/>
					<TopFold factor={factor}/>
				</FilterHeader>
				<TopJoint objective={objective} factor={factor} conditional={conditional} indicator={indicator}/>
			</FilterContainer>
		</JointEventBusProvider>
	</FilterEventBusProvider>;
};