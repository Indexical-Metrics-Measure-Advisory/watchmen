import {Topic, TopicId} from '@/services/data/tuples/topic-types';
import {Fragment, useEffect} from 'react';
import {useAchievementEventBus} from '../../../../achievement/achievement-event-bus';
import {AchievementEventTypes} from '../../../../achievement/achievement-event-bus-types';
import {useObjectiveAnalysisEventBus} from '../../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../../objective-analysis-event-bus-types';

export const TopicsDataProxy = () => {
	const {on, off} = useAchievementEventBus();
	const {fire} = useObjectiveAnalysisEventBus();
	useEffect(() => {
		const onAskTopic = (topicId: TopicId, onData: (topic?: Topic) => void) => {
			fire(ObjectiveAnalysisEventTypes.ASK_TOPIC, topicId, onData);
		};
		on(AchievementEventTypes.ASK_TOPIC, onAskTopic);
		return () => {
			off(AchievementEventTypes.ASK_TOPIC, onAskTopic);
		};
	}, [on, off, fire]);

	return <Fragment/>;
};