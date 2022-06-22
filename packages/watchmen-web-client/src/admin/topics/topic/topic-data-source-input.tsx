import {QueryDataSourceForHolder} from '@/services/data/tuples/query-data-source-types';
import {Topic, TopicType} from '@/services/data/tuples/topic-types';
import {isRawTopic, isS3Storage} from '@/services/data/tuples/topic-utils';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {TuplePropertyDropdown} from '@/widgets/tuple-workbench/tuple-editor';
import React, {useEffect} from 'react';
import {useTopicEventBus} from '../topic-event-bus';
import {TopicEventTypes} from '../topic-event-bus-types';

export const TopicDataSourceInput = (props: { topic: Topic; dataSources: Array<QueryDataSourceForHolder> }) => {
	const {topic, dataSources} = props;

	const {on, off, fire} = useTopicEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onTopicTypeChanged = () => {
			if (!isRawTopic(topic)) {
				// eslint-disable-next-line
				const dataSource = dataSources.find(dataSource => dataSource.dataSourceId == topic.dataSourceId);
				if (dataSource != null && isS3Storage(dataSource.dataSourceType)) {
					delete topic.dataSourceId;
					fire(TopicEventTypes.TOPIC_DATA_SOURCE_CHANGED, topic);
				}
			}
			forceUpdate();
		};
		on(TopicEventTypes.TOPIC_TYPE_CHANGED, onTopicTypeChanged);
		return () => {
			off(TopicEventTypes.TOPIC_TYPE_CHANGED, onTopicTypeChanged);
		};
	}, [on, off, fire, topic, dataSources, forceUpdate]);

	const onDataSourceChange = (option: DropdownOption) => {
		topic.dataSourceId = option.value as TopicType;
		fire(TopicEventTypes.TOPIC_DATA_SOURCE_CHANGED, topic);
		forceUpdate();
	};

	const options: Array<DropdownOption> = dataSources.filter(dataSource => {
		if (topic.type === TopicType.RAW) {
			return true;
		} else {
			return !isS3Storage(dataSource.dataSourceType);
		}
	}).map(dataSource => {
		return {value: dataSource.dataSourceId, label: dataSource.dataSourceCode};
	});

	return <TuplePropertyDropdown value={topic.dataSourceId || ''} options={options} onChange={onDataSourceChange}/>;
};