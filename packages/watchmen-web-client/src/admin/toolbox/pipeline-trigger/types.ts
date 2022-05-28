import {ParameterJoint} from '@/services/data/tuples/factor-calculator-types';
import {TopicId} from '@/services/data/tuples/topic-types';

export interface TriggerTopicFilter {
	topicId: TopicId;
	joint: ParameterJoint;
}