import {Consanguinity} from '@/services/data/tuples/consanguinity';
import {
	DiagramIndicatorList,
	DiagramIndicatorMap,
	DiagramObjectiveFactorList,
	DiagramObjectiveFactorMap,
	DiagramObjectiveTargetList,
	DiagramObjectiveTargetMap,
	DiagramRelations,
	DiagramSubjectColumnMap,
	DiagramSubjectList,
	DiagramTopicFactorMap,
	DiagramTopicList
} from './types';

export const getObjectiveTargets = (consanguinity: Consanguinity): { list: DiagramObjectiveTargetList, map: DiagramObjectiveTargetMap } => {
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
export const getObjectiveFactors = (consanguinity: Consanguinity): { list: DiagramObjectiveFactorList, map: DiagramObjectiveFactorMap } => {
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
export const getIndicators = (consanguinity: Consanguinity): { list: DiagramIndicatorList, map: DiagramIndicatorMap } => {
	const indicators = (consanguinity.indicators || []);
	const map = indicators.reduce((map, indicator) => {
		map[indicator['@cid']] = indicator;
		return map;
	}, {} as DiagramIndicatorMap);

	return {list: indicators, map};
};
export const getSubjects = (consanguinity: Consanguinity): { list: DiagramSubjectList, map: DiagramSubjectColumnMap } => {
	const subjects = (consanguinity.subjects || []);
	const map = subjects.reduce((map, subject) => {
		(subject.columns || []).forEach(column => {
			map[column['@cid']] = {...column, subject};
		});
		return map;
	}, {} as DiagramSubjectColumnMap);

	return {list: subjects, map};
};
export const getTopics = (consanguinity: Consanguinity): { list: DiagramTopicList, map: DiagramTopicFactorMap } => {
	const topics = (consanguinity.topics || []);
	const map = topics.reduce((map, topic) => {
		(topic.factors || []).forEach(factor => {
			map[factor['@cid']] = {...factor, topic};
		});
		return map;
	}, {} as DiagramTopicFactorMap);

	return {list: topics, map};
};

export const getRelations = (consanguinity: Consanguinity): Array<DiagramRelations> => {
	return (consanguinity.relations || []).map(relation => {
		const {'@cid': cid, from} = relation;
		return (from || []).map(({'@cid': fromCid, type}) => {
			return {from: fromCid, to: cid, type};
		});
	}).flat();
};