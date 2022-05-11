import {Factor, FactorType} from '@/services/data/tuples/factor-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import React, {ChangeEvent, useEffect} from 'react';
import {FactorPrecisions} from '../constants';
import {useTopicEventBus} from '../topic-event-bus';
import {TopicEventTypes} from '../topic-event-bus-types';
import {FactorPrecisionCellContainer, FactorPropInput, FactorPropLabel} from './widgets';

const getPlaceholder = (factorType: FactorType): string => {
	return FactorPrecisions[factorType] ?? '';
};

export const FactorPrecisionCell = (props: { topic: Topic, factor: Factor }) => {
	const {factor} = props;

	const {on, off, fire} = useTopicEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		on(TopicEventTypes.FACTOR_TYPE_CHANGED, forceUpdate);
		return () => {
			off(TopicEventTypes.FACTOR_TYPE_CHANGED, forceUpdate);
		};
	}, [on, off, forceUpdate]);

	const placeholder = getPlaceholder(factor.type);
	if (placeholder === '')
		return null;

	const onFactorPrecisionChange = (event: ChangeEvent<HTMLInputElement>) => {
		const {value} = event.target;
		if (value === factor.precision) {
			return;
		}
		factor.precision = value;
		forceUpdate();
		fire(TopicEventTypes.FACTOR_PRECISION_CHANGED, factor);
	};

	return <>
		<FactorPropLabel>Precision</FactorPropLabel>
		<FactorPrecisionCellContainer>
			<FactorPropInput value={factor.precision || ''} onChange={onFactorPrecisionChange}
			                 placeholder={placeholder}/>
		</FactorPrecisionCellContainer>
	</>;
};
