import {Factor, FactorType} from '@/services/data/tuples/factor-types';
import {Topic} from '@/services/data/tuples/topic-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import React, {ChangeEvent, useEffect} from 'react';
import {useTopicEventBus} from '../topic-event-bus';
import {TopicEventTypes} from '../topic-event-bus-types';
import {FactorPrecisionCellContainer, FactorPropInput, FactorPropLabel} from './widgets';

const PLACEHOLDERS: Partial<{ [key in FactorType]: string }> = {
	[FactorType.NUMBER]: '32,6',
	[FactorType.UNSIGNED]: '32,6',
	[FactorType.TEXT]: '255',
	[FactorType.CONTINENT]: '10',
	[FactorType.REGION]: '10',
	[FactorType.COUNTRY]: '10',
	[FactorType.PROVINCE]: '10',
	[FactorType.CITY]: '10',
	[FactorType.DISTRICT]: '255',
	[FactorType.ROAD]: '255',
	[FactorType.COMMUNITY]: '100',
	[FactorType.RESIDENCE_TYPE]: '10',
	[FactorType.RESIDENTIAL_AREA]: '10,2',
	[FactorType.EMAIL]: '100',
	[FactorType.PHONE]: '50',
	[FactorType.MOBILE]: '50',
	[FactorType.FAX]: '50',
	[FactorType.GENDER]: '10',
	[FactorType.OCCUPATION]: '10',
	[FactorType.ID_NO]: '50',
	[FactorType.RELIGION]: '10',
	[FactorType.NATIONALITY]: '10',
	[FactorType.BIZ_TRADE]: '10',
	[FactorType.ENUM]: '20'
};
const getPlaceholder = (factorType: FactorType): string => {
	return PLACEHOLDERS[factorType] ?? '';
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
