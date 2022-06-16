import {ParameterJoint} from '@/services/data/tuples/factor-calculator-types';
import {PipelineId} from '@/services/data/tuples/pipeline-types';
import {TopicId} from '@/services/data/tuples/topic-types';

export interface TriggerTopicFilter {
	topicId: TopicId;
	joint: ParameterJoint;
	pipelineIds: Array<PipelineId>;
}