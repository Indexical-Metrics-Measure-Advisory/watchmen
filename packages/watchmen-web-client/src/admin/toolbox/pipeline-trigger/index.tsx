import {Topic, TopicId} from '@/services/data/tuples/topic-types';
import {AdminCacheData} from '@/services/local-persist/types';
import {VerticalMarginOneUnit} from '@/widgets/basic/margin';
import {FixWidthPage} from '@/widgets/basic/page';
import {PageHeader} from '@/widgets/basic/page-header';
import {DropdownOption} from '@/widgets/basic/types';
import React, {useEffect, useState} from 'react';
import {useAdminCacheEventBus} from '../../cache/cache-event-bus';
import {AdminCacheEventTypes} from '../../cache/cache-event-bus-types';
import {PipelineTriggerLabel, TopicDropdown, TopicPickerContainer} from './widgets';

export const PipelineTrigger = () => {
	const {fire: fireCache} = useAdminCacheEventBus();
	const [topics, setTopics] = useState<Array<Topic>>([]);
	const [selectedTopicId, setSelectedTopicId] = useState<TopicId | null>(null);
	useEffect(() => {
		const askData = () => {
			fireCache(AdminCacheEventTypes.ASK_DATA_LOADED, (loaded) => {
				if (loaded) {
					fireCache(AdminCacheEventTypes.ASK_DATA, (data?: AdminCacheData) => {
						setTopics(data?.topics || []);
					});
				} else {
					setTimeout(() => askData(), 100);
				}
			});
		};
		askData();
	}, []);

	const onChange = (option: DropdownOption) => {
		setSelectedTopicId(option.value as TopicId);
	};

	const options = topics.map(topic => {
		return {
			value: topic.topicId,
			label: topic.name || 'Noname Topic'
		};
	});

	return <FixWidthPage>
		<PageHeader title="Pipeline Trigger"/>
		<VerticalMarginOneUnit/>
		<TopicPickerContainer>
			<PipelineTriggerLabel>Pick a topic</PipelineTriggerLabel>
			<TopicDropdown value={selectedTopicId} options={options} onChange={onChange}
			               please="To trigger pipelines"/>
		</TopicPickerContainer>
	</FixWidthPage>;
};