import {FactorId} from './factor-types';
import {PipelineId} from './pipeline-types';
import {TopicId} from './topic-types';

export interface FactorLineageNode {
	topicId: TopicId;
	topicName?: string;
	factorId: FactorId;
	factorName?: string;
	factorType?: string;
	isTarget: boolean;
}

export interface FactorLineageEdge {
	level: number;
	sourceTopicId: TopicId;
	sourceFactorId: FactorId;
	sourceFactorName?: string;
	targetTopicId: TopicId;
	targetFactorId: FactorId;
	targetFactorName?: string;
	relationType?: string;
	arithmetic?: string;
	pipelineId?: PipelineId;
	pipelineName?: string;
}

export interface FactorConsanguinity {
	topicId: TopicId;
	topicName?: string;
	factorId: FactorId;
	factorName?: string;
	nodes: Array<FactorLineageNode>;
	edges: Array<FactorLineageEdge>;
	maxLevel: number;
}
