import {fetchTopicForIndicator} from '@/services/data/tuples/indicator';
import {Topic, TopicId} from '@/services/data/tuples/topic-types';
import {useEffect, useState} from 'react';
import {useObjectivesEventBus} from '../objectives-event-bus';
import {ObjectivesEventTypes} from '../objectives-event-bus-types';

type Topics = Record<TopicId, Topic>
export const useTopicDetail = () => {
	const {on, off} = useObjectivesEventBus();
	const [topics] = useState<Topics>({});

	useEffect(() => {
		const onAskTopic = async (topicId: TopicId, onData: (topic?: Topic) => void) => {
			const found = topics[`${topicId}`];
			if (found != null) {
				onData(found);
			} else {
				const topic = await fetchTopicForIndicator(topicId);
				// sync to state
				topics[`${topic.topicId}`] = topic;
				onData(topic);
			}
		};
		on(ObjectivesEventTypes.ASK_TOPIC, onAskTopic);
		return () => {
			off(ObjectivesEventTypes.ASK_TOPIC, onAskTopic);
		};
	}, [on, off, topics]);
};