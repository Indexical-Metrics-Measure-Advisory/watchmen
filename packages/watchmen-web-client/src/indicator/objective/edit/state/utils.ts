import {Indicator, IndicatorBaseOn, IndicatorId} from '@/services/data/tuples/indicator-types';
import {Objective, ObjectiveFactorOnIndicator} from '@/services/data/tuples/objective-types';
import {SubjectId} from '@/services/data/tuples/subject-types';
import {TopicId} from '@/services/data/tuples/topic-types';
import {isNotBlank} from '@/services/utils';
import {isIndicatorFactor} from '../utils';

export const findIndicators = async (
	objective: Objective,
	askIndicator: (indicatorId: IndicatorId) => Promise<Indicator | null>
): Promise<Array<Indicator>> => {
	const indicatorIds = (objective.factors || [])
		.filter(f => isIndicatorFactor(f))
		.map(f => (f as ObjectiveFactorOnIndicator).indicatorId)
		.filter(indicatorId => isNotBlank(indicatorId)) as Array<IndicatorId>;
	return (await Promise.all(indicatorIds.map(indicatorId => {
		return new Promise<Indicator | null>(async resolve => {
			const indicator = await askIndicator(indicatorId);
			resolve(indicator);
		});
	}))).filter(indicator => indicator != null) as Array<Indicator>;
};

export const findTopicIds = async (
	objective: Objective,
	askIndicator: (indicatorId: IndicatorId) => Promise<Indicator | null>
): Promise<Array<TopicId>> => {
	const indicators = await findIndicators(objective, askIndicator);
	const map: Record<TopicId, boolean> = {};
	indicators
		.filter(indicator => indicator.baseOn === IndicatorBaseOn.TOPIC)
		.map(indicator => indicator.topicOrSubjectId)
		.filter(topicId => isNotBlank(topicId))
		.forEach(topicId => map[`${topicId}`] = true);
	return Object.keys(map);
};

export const findSubjectIds = async (
	objective: Objective,
	askIndicator: (indicatorId: IndicatorId) => Promise<Indicator | null>
): Promise<Array<SubjectId>> => {
	const indicators = await findIndicators(objective, askIndicator);
	const map: Record<SubjectId, boolean> = {};
	indicators
		.filter(indicator => indicator.baseOn === IndicatorBaseOn.SUBJECT)
		.map(indicator => indicator.topicOrSubjectId)
		.filter(subjectId => isNotBlank(subjectId))
		.forEach(subjectId => map[`${subjectId}`] = true);
	return Object.keys(map);
};