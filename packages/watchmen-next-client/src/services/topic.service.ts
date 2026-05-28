import { Topic } from "../models";

export const getTopicDomainList = (topics: Topic[]) => {
	return [...new Set(topics.map(t => t.domain).filter(Boolean))] as string[];
};

export const getTopicStats = (topics: Topic[]) => {
	return {
		total: topics.length,
		totalFactors: topics.reduce((sum, t) => sum + t.factors.length, 0),
		domainCount: getTopicDomainList(topics).length,
		businessCount: topics.filter(t => t.kind === 'business').length,
	};
};

export const getTopicsByDomain = (topics: Topic[], domain: string) => {
	return topics.filter(t => t.domain === domain);
};