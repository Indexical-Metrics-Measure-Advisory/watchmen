import {Topic, TopicLayer} from '@/services/data/tuples/topic-types';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {TuplePropertyDropdown} from '@/widgets/tuple-workbench/tuple-editor';
import React from 'react';
import {useTopicEventBus} from '../topic-event-bus';
import {TopicEventTypes} from '../topic-event-bus-types';

const TopicLayerOptions: Array<DropdownOption> = [
	{value: TopicLayer.Raw, label: 'raw '},
	{value: TopicLayer.DOMAIN, label: 'Domain'},
	{value: TopicLayer.ODS, label: 'ODS'},
    {value: TopicLayer.MART, label: 'Mart'}
];




export const TopicLayerInput = (props: { topic: Topic }) => {
	const {topic} = props;

	const {fire} = useTopicEventBus();
	const forceUpdate = useForceUpdate();
	const onTypeChange = (option: DropdownOption) => {
		topic.layer= option.value as TopicLayer;
		fire(TopicEventTypes.TOPIC_LAYER_CHANGED, topic);
		forceUpdate();
	};

	return <TuplePropertyDropdown value={topic.layer} options={TopicLayerOptions} onChange={onTypeChange}/>;
};