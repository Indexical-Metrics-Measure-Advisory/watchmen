import { Pipeline, Topic } from "../models";

export const getPipelineStats = (pipelines: Pipeline[]) => {
	return {
		total: pipelines.length,
		running: pipelines.filter(p => p.enabled && p.healthStatus === 'healthy').length,
		failing: pipelines.filter(p => p.enabled && p.healthStatus === 'error').length,
		degraded: pipelines.filter(p => p.enabled && (p.healthStatus === 'warning' || !p.validated)).length,
		disabled: pipelines.filter(p => !p.enabled).length,
	};
};

export const getPipelineTopicMap = (topics: Topic[]) => {
	return new Map(topics.map(t => [t.topicId, t]));
};