import {ParameterJointType} from '@/services/data/tuples/factor-calculator-types';
import {Indicator, IndicatorFilter} from '@/services/data/tuples/indicator-types';
import {TopicForIndicator} from '@/services/data/tuples/query-indicator-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {isFakedUuid} from '@/services/data/tuples/utils';
import {noop} from '@/services/utils';
import React, {useEffect} from 'react';
import {useIndicatorsEventBus} from '../../indicators-event-bus';
import {IndicatorsEventTypes} from '../../indicators-event-bus-types';
import {FilterEventBusProvider, useFilterEventBus} from './filter-event-bus';
import {FilterEventTypes} from './filter-event-bus-types';
import {JointEdit} from './joint-filter/joint-edit';

const TopFilter = (props: { indicator: Indicator; filter: IndicatorFilter; topic: Topic; }) => {
	const {indicator, filter, topic} = props;

	const {fire: fireIndicator} = useIndicatorsEventBus();
	const {on, off} = useFilterEventBus();
	useEffect(() => {
		const onChanged = () => {
			fireIndicator(IndicatorsEventTypes.FILTER_CHANGED, indicator);
			if (!isFakedUuid(indicator)) {
				fireIndicator(IndicatorsEventTypes.SAVE_INDICATOR, indicator, noop);
			}
		};

		on(FilterEventTypes.JOINT_TYPE_CHANGED, onChanged);
		on(FilterEventTypes.FILTER_ADDED, onChanged);
		on(FilterEventTypes.FILTER_REMOVED, onChanged);
		on(FilterEventTypes.CONTENT_CHANGED, onChanged);
		return () => {
			off(FilterEventTypes.JOINT_TYPE_CHANGED, onChanged);
			off(FilterEventTypes.FILTER_ADDED, onChanged);
			off(FilterEventTypes.FILTER_REMOVED, onChanged);
			off(FilterEventTypes.CONTENT_CHANGED, onChanged);
		};
	}, [on, off, fireIndicator, indicator]);

	return <JointEdit joint={filter.joint} topic={topic}/>;
};

export const TopFilterEdit = (props: { indicator: Indicator; topic: TopicForIndicator; }) => {
	const {indicator, topic} = props;

	if (indicator.filter == null) {
		indicator.filter = {enabled: false, joint: {jointType: ParameterJointType.AND, filters: []}};
	}
	const filter = indicator.filter!;

	return <FilterEventBusProvider>
		<TopFilter indicator={indicator} filter={filter} topic={{...topic} as Topic}/>
	</FilterEventBusProvider>;
};