import {FactorType} from '@/services/data/tuples/factor-types';
import {TopicKind, TopicType} from '@/services/data/tuples/topic-types';
import {TuplePage} from '../../query/tuple-page';
import {
	Consanguinity,
	ConsanguinityIndicator,
	ConsanguinityLineType,
	ConsanguinityObjective,
	ConsanguinityObjectiveFactor,
	ConsanguinityObjectiveTarget,
	ConsanguinitySubject,
	ConsanguinitySubjectColumn,
	ConsanguinityTopic,
	ConsanguinityTopicFactor,
	ConsanguinityUniqueId
} from '../../tuples/consanguinity';
import {IndicatorAggregateArithmetic} from '../../tuples/indicator-types';
import {Objective, ObjectiveFactor, ObjectiveId, ObjectiveValues} from '../../tuples/objective-types';
import {QueryObjective} from '../../tuples/query-objective-types';
import {SubjectColumnArithmetic} from '../../tuples/subject-types';
import {generateUuid, isFakedUuid} from '../../tuples/utils';
import {MonthlyOrderPremiumIndicator} from './mock-data-indicators';
import {DemoObjectives, MonthlySalesObjective} from './mock-data-objectives';

export const listMockObjectives = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<QueryObjective>> => {
	const {pageNumber = 1, pageSize = 9} = options;
	return new Promise<TuplePage<QueryObjective>>((resolve) => {
		setTimeout(() => {
			resolve({
				data: DemoObjectives,
				itemCount: DemoObjectives.length,
				pageNumber,
				pageSize,
				pageCount: 1
			});
		}, 1000);
	});
};

export const fetchMockObjective = async (objectiveId: ObjectiveId): Promise<Objective> => {
	// eslint-disable-next-line
	const found = DemoObjectives.find(({objectiveId: id}) => id == objectiveId);
	if (found) {
		return JSON.parse(JSON.stringify(found));
	} else {
		return {...MonthlySalesObjective, objectiveId};
	}
};

let newObjectiveId = 10000;
export const saveMockObjective = async (objective: Objective): Promise<void> => {
	return new Promise<void>((resolve) => {
		if (isFakedUuid(objective)) {
			objective.objectiveId = `${newObjectiveId++}`;
		}
		setTimeout(() => resolve(), 500);
	});
};

export const askMockObjectiveFactorValue = async (objective: Objective, factor: ObjectiveFactor): Promise<{ value?: number }> => {
	return new Promise<{ value?: number }>(resolve => {
		setTimeout(() => resolve({value: Math.random() * 10000}));
	});
};

export const askMockObjectiveValues = async (objective: Objective): Promise<ObjectiveValues> => {
	return new Promise<ObjectiveValues>(resolve => {
		setTimeout(() => {
			resolve({
				factors: (objective.factors || []).map(factor => {
					const value = Math.random() * 10000;
					return {
						uuid: factor.uuid,
						currentValue: value,
						previousValue: value * 0.9,
						chainValue: value * 0.8,
						failed: false
					};
				}),
				targets: (objective.targets || []).map(target => {
					const value = Math.random() * 10000;
					return {
						uuid: target.uuid,
						currentValue: value,
						previousValue: value * 0.9,
						chainValue: value * 0.8,
						failed: false
					};
				})
			});
		}, 3000);
	});
};

export const fetchMockConsanguinity = async (objective: Objective): Promise<Consanguinity> => {
	return new Promise<Consanguinity>(resolve => {
		setTimeout(() => {
			const cidMap: Record<ConsanguinityUniqueId, boolean> = {};
			const askCid = (): ConsanguinityUniqueId => {
				const cid = generateUuid();
				if (cidMap[cid]) {
					return askCid();
				} else {
					cidMap[cid] = true;
					return cid;
				}
			};

			const objectives = DemoObjectives.map(objective => {
				const cloned: Objective = JSON.parse(JSON.stringify(objective));
				cloned.targets = [
					...(cloned.targets || []).map(target => {
						(target as ConsanguinityObjectiveTarget)['@cid'] = askCid();
						return target;
					})
				];
				cloned.factors = [
					...((cloned.factors || []).map(factor => {
						(factor as ConsanguinityObjectiveFactor)['@cid'] = askCid();
						return factor;
					}))
				];
				return cloned as unknown as ConsanguinityObjective;
			});
			const indicators: Array<ConsanguinityIndicator> = [
				{...MonthlyOrderPremiumIndicator, '@cid': askCid()},
				{
					indicatorId: generateUuid(), name: 'Quarterly Order Premium',
					aggregateArithmetic: IndicatorAggregateArithmetic.SUM, '@cid': askCid()
				}
			];
			const subjects: Array<ConsanguinitySubject> = [
				{
					subjectId: generateUuid(), name: 'Order Premium', columns: [
						{
							columnId: generateUuid(), alias: 'Premium Amount',
							recalculate: false, arithmetic: SubjectColumnArithmetic.SUMMARY,
							'@cid': askCid()
						} as ConsanguinitySubjectColumn,
						{columnId: generateUuid(), alias: 'Year', '@cid': askCid()} as ConsanguinitySubjectColumn,
						{columnId: generateUuid(), alias: 'Month', '@cid': askCid()} as ConsanguinitySubjectColumn
					]
				}
			];
			const topics: Array<ConsanguinityTopic> = [
				{
					topicId: generateUuid(), name: 'Order', kind: TopicKind.BUSINESS, type: TopicType.DISTINCT,
					factors: [
						{
							factorId: generateUuid(), name: 'OrderNo', type: FactorType.TEXT, '@cid': askCid()
						} as ConsanguinityTopicFactor,
						{
							factorId: generateUuid(), name: 'OrderDate', type: FactorType.DATE, '@cid': askCid()
						} as ConsanguinityTopicFactor
					]
				},
				{
					topicId: generateUuid(), name: 'Order Item', kind: TopicKind.BUSINESS, type: TopicType.DISTINCT,
					factors: [
						{
							factorId: generateUuid(), name: 'OrderNo', type: FactorType.TEXT, '@cid': askCid()
						} as ConsanguinityTopicFactor,
						{
							factorId: generateUuid(), name: 'OrderItemSeq', type: FactorType.NUMBER, '@cid': askCid()
						} as ConsanguinityTopicFactor,
						{
							factorId: generateUuid(), name: 'Premium', type: FactorType.NUMBER, '@cid': askCid()
						} as ConsanguinityTopicFactor
					]
				}
			];

			resolve({
				objectives, indicators, subjects, topics,
				relations: [
					{
						'@cid': objectives[0].targets[0]['@cid'],
						from: [{
							'@cid': objectives[0].factors[0]['@cid'],
							type: ConsanguinityLineType.OBJECTIVE_FACTOR_TO_TARGET__REFER
						}]
					},
					{
						'@cid': objectives[0].targets[1]['@cid'],
						from: [{
							'@cid': objectives[0].factors[2]['@cid'],
							type: ConsanguinityLineType.OBJECTIVE_FACTOR_TO_TARGET__REFER
						}]
					},
					{
						'@cid': objectives[0].targets[2]['@cid'],
						from: [{
							'@cid': objectives[0].factors[4]['@cid'],
							type: ConsanguinityLineType.OBJECTIVE_FACTOR_TO_TARGET__REFER
						}]
					},
					{
						'@cid': objectives[0].targets[3]['@cid'],
						from: [{
							'@cid': objectives[0].factors[5]['@cid'],
							type: ConsanguinityLineType.OBJECTIVE_FACTOR_TO_TARGET__COMPUTE
						}]
					},
					{
						'@cid': objectives[0].targets[4]['@cid'],
						from: [{
							'@cid': objectives[0].factors[0]['@cid'],
							type: ConsanguinityLineType.OBJECTIVE_FACTOR_TO_TARGET__COMPUTE
						}, {
							'@cid': objectives[0].factors[5]['@cid'],
							type: ConsanguinityLineType.OBJECTIVE_FACTOR_TO_TARGET__COMPUTE
						}]
					},
					{
						'@cid': objectives[0].factors[0]['@cid'],
						from: [{
							'@cid': indicators[0]['@cid'],
							type: ConsanguinityLineType.INDICATOR_TO_OBJECTIVE_FACTOR
						}]
					},
					{
						'@cid': objectives[0].factors[1]['@cid'],
						from: [{
							'@cid': objectives[0].factors[0]['@cid'],
							type: ConsanguinityLineType.OBJECTIVE_FACTOR_TO_FACTOR__COMPUTE
						}]
					},
					{
						'@cid': objectives[0].factors[2]['@cid'],
						from: [{
							'@cid': objectives[0].factors[0]['@cid'],
							type: ConsanguinityLineType.OBJECTIVE_FACTOR_TO_FACTOR__COMPUTE
						}]
					},
					{
						'@cid': objectives[0].factors[3]['@cid'],
						from: [{
							'@cid': objectives[0].factors[0]['@cid'],
							type: ConsanguinityLineType.OBJECTIVE_FACTOR_TO_FACTOR__COMPUTE
						}]
					},
					{
						'@cid': objectives[0].factors[4]['@cid'],
						from: [{
							'@cid': objectives[0].factors[1]['@cid'],
							type: ConsanguinityLineType.OBJECTIVE_FACTOR_TO_FACTOR__COMPUTE
						}, {
							'@cid': objectives[0].factors[2]['@cid'],
							type: ConsanguinityLineType.OBJECTIVE_FACTOR_TO_FACTOR__COMPUTE
						}, {
							'@cid': objectives[0].factors[3]['@cid'],
							type: ConsanguinityLineType.OBJECTIVE_FACTOR_TO_FACTOR__COMPUTE
						}]
					},
					{
						'@cid': objectives[0].factors[5]['@cid'],
						from: [{
							'@cid': objectives[0].factors[0]['@cid'],
							type: ConsanguinityLineType.OBJECTIVE_FACTOR_TO_FACTOR__COMPUTE
						}, {
							'@cid': objectives[0].factors[4]['@cid'],
							type: ConsanguinityLineType.OBJECTIVE_FACTOR_TO_FACTOR__COMPUTE
						}]
					},
					{
						'@cid': indicators[0]['@cid'],
						from: [{
							'@cid': subjects[0].columns[0]['@cid'],
							type: ConsanguinityLineType.SUBJECT_COLUMN_TO_INDICATOR__REFER
						}]
					},
					{
						'@cid': indicators[1]['@cid'],
						from: [{
							'@cid': subjects[0].columns[0]['@cid'],
							type: ConsanguinityLineType.SUBJECT_COLUMN_TO_INDICATOR__REFER
						}]
					},
					{
						'@cid': subjects[0].columns[0]['@cid'],
						from: [{
							'@cid': topics[0].factors[0]['@cid'],
							type: ConsanguinityLineType.TOPIC_FACTOR_TO_SUBJECT_COLUMN__COMPUTE
						}, {
							'@cid': topics[1].factors[0]['@cid'],
							type: ConsanguinityLineType.TOPIC_FACTOR_TO_SUBJECT_COLUMN__COMPUTE
						}, {
							'@cid': topics[1].factors[2]['@cid'],
							type: ConsanguinityLineType.TOPIC_FACTOR_TO_SUBJECT_COLUMN__COMPUTE
						}]
					},
					{
						'@cid': subjects[0].columns[1]['@cid'],
						from: [{
							'@cid': topics[0].factors[1]['@cid'],
							type: ConsanguinityLineType.TOPIC_FACTOR_TO_SUBJECT_COLUMN__COMPUTE
						}]
					},
					{
						'@cid': subjects[0].columns[2]['@cid'],
						from: [{
							'@cid': topics[0].factors[1]['@cid'],
							type: ConsanguinityLineType.TOPIC_FACTOR_TO_SUBJECT_COLUMN__COMPUTE
						}]
					}
				]
			});
		}, 1000);
	});
};
