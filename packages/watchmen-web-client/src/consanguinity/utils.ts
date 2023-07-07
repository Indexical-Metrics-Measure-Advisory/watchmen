import {Consanguinity, ConsanguinitySubject, ConsanguinityTopic} from '@/services/data/tuples/consanguinity-types';
import {
	DiagramIndicatorList,
	DiagramIndicatorMap,
	DiagramObjectiveFactorList,
	DiagramObjectiveFactorMap,
	DiagramObjectiveTargetList,
	DiagramObjectiveTargetMap,
	DiagramRelation,
	DiagramSubjectColumnMap,
	DiagramSubjectList,
	DiagramTopicFactorMap,
	DiagramTopicList
} from './types';

export const getObjectiveTargets = (consanguinity: Consanguinity): {
	list: DiagramObjectiveTargetList,
	map: DiagramObjectiveTargetMap
} => {
	const targets = (consanguinity.objectives || [])
		.map(objective => {
			return (objective.targets || []).map(target => {
				return {...target, objective};
			});
		})
		.flat() as DiagramObjectiveTargetList;
	const map = targets.reduce((map, target) => {
		map[target['@cid']] = target;
		return map;
	}, {} as DiagramObjectiveTargetMap);

	return {list: targets, map};
};
export const getObjectiveFactors = (consanguinity: Consanguinity): {
	list: DiagramObjectiveFactorList,
	map: DiagramObjectiveFactorMap
} => {
	const factors = (consanguinity.objectives || [])
		.map(objective => {
			return (objective.factors || []).map(factor => {
				return {...factor, objective};
			});
		})
		.flat() as DiagramObjectiveFactorList;
	const map = factors.reduce((map, factor) => {
		map[factor['@cid']] = factor;
		return map;
	}, {} as DiagramObjectiveFactorMap);

	return {list: factors, map};
};
export const getIndicators = (consanguinity: Consanguinity): {
	list: DiagramIndicatorList,
	map: DiagramIndicatorMap
} => {
	const indicators = (consanguinity.indicators || []);
	const map = indicators.reduce((map, indicator) => {
		map[indicator['@cid']] = indicator;
		return map;
	}, {} as DiagramIndicatorMap);

	return {list: indicators, map};
};
export const getSubjects = (consanguinity: Consanguinity): {
	list: DiagramSubjectList,
	map: DiagramSubjectColumnMap
} => {
	const subjects = (consanguinity.subjects || [])
		.map(subject => (JSON.parse(JSON.stringify(subject))) as ConsanguinitySubject)
		.map(subject => {
			subject.columns = (subject.columns || []).map(column => {
				return {...column, subject};
			});
			return subject;
		})
		.flat() as DiagramSubjectList;
	const map = subjects.reduce((map, subject) => {
		(subject.columns || []).forEach(column => {
			map[column['@cid']] = {...column, subject};
		});
		return map;
	}, {} as DiagramSubjectColumnMap);

	return {list: subjects, map};
};
export const getTopics = (consanguinity: Consanguinity): { list: DiagramTopicList, map: DiagramTopicFactorMap } => {
	const topics = (consanguinity.topics || [])
		.map(topic => (JSON.parse(JSON.stringify(topic))) as ConsanguinityTopic)
		.map(topic => {
			topic.factors = (topic.factors || []).map(factor => {
				return {...factor, topic};
			});
			return topic;
		})
		.flat() as DiagramTopicList;
	const map = topics.reduce((map, topic) => {
		(topic.factors || []).forEach(factor => {
			map[factor['@cid']] = {...factor, topic};
		});
		return map;
	}, {} as DiagramTopicFactorMap);

	return {list: topics, map};
};

export const getRelations = (consanguinity: Consanguinity): Array<DiagramRelation> => {
	return (consanguinity.relations || []).map(relation => {
		const {'@cid': cid, from} = relation;
		return (from || []).map(({'@cid': fromCid, type}) => {
			return {from: fromCid, to: cid, type};
		});
	}).flat();
};