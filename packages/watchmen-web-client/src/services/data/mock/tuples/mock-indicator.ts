import {TuplePage} from '../../query/tuple-page';
import {ParameterJointType, ParameterKind} from '../../tuples/factor-calculator-types';
import {isIndicatorFactor} from '../../tuples/factor-calculator-utils';
import {Indicator, IndicatorBaseOn, IndicatorId} from '../../tuples/indicator-types';
import {
	EnumForIndicator,
	QueryIndicator,
	QueryIndicatorCategoryParams,
	SubjectForIndicator,
	TopicForIndicator
} from '../../tuples/query-indicator-types';
import {SubjectColumnArithmetic, SubjectDataSetFilter, SubjectDataSetJoin} from '../../tuples/subject-types';
import {TopicId, TopicKind, TopicType} from '../../tuples/topic-types';
import {isFakedUuid} from '../../tuples/utils';
import {DemoTopics, MonthlyOrderPremium} from '../tuples/mock-data-topics';
import {DemoConnectedSpaces} from './mock-data-connected-spaces';
import {DemoIndicators, MonthlyOrderPremiumIndicator, OrderPremiumIndicators} from './mock-data-indicators';
import {listMockEnums} from './mock-enum';

const MOCK_SUBJECT = {
	subjectId: '1',
	name: 'Order Premium',
	dataset: {
		columns: [
			{
				columnId: '1',
				parameter: {kind: ParameterKind.TOPIC, topicId: '6', factorId: '601'},
				arithmetic: SubjectColumnArithmetic.NONE,
				alias: 'Year'
			}, {
				columnId: '2',
				parameter: {kind: ParameterKind.TOPIC, topicId: '6', factorId: '602'},
				arithmetic: SubjectColumnArithmetic.NONE,
				alias: 'Month'
			}, {
				columnId: '3',
				parameter: {kind: ParameterKind.TOPIC, topicId: '6', factorId: '603'},
				arithmetic: SubjectColumnArithmetic.NONE,
				alias: 'Premium'
			}, {
				columnId: '4',
				parameter: {kind: ParameterKind.TOPIC, topicId: '6', factorId: '604'},
				arithmetic: SubjectColumnArithmetic.NONE,
				alias: 'City'
			}, {
				columnId: '5',
				parameter: {kind: ParameterKind.TOPIC, topicId: '6', factorId: '605'},
				arithmetic: SubjectColumnArithmetic.NONE,
				alias: 'Floor'
			}
		],
		filters: {jointType: ParameterJointType.AND, filters: [] as Array<SubjectDataSetFilter>},
		joins: [] as Array<SubjectDataSetJoin>
	},
	topics: [MonthlyOrderPremium]
} as SubjectForIndicator;

export const fetchMockIndicatorsForSelection = async (text: string): Promise<Array<QueryIndicator>> => {
	return new Promise<Array<QueryIndicator>>(resolve => {
		const matchedText = text.toUpperCase();
		setTimeout(() => {
			resolve(OrderPremiumIndicators.filter(indicator => indicator.name.toUpperCase().includes(matchedText)));
		}, 500);
	});
};

export const listMockIndicatorsForExport = async (): Promise<Array<Indicator>> => {
	return new Promise<Array<Indicator>>(resolve => {
		setTimeout(() => {
			resolve(OrderPremiumIndicators);
		}, 500);
	});
};

export const fetchMockTopicsForIndicatorSelection = async (text: string): Promise<Array<TopicForIndicator>> => {
	return new Promise<Array<TopicForIndicator>>(resolve => {
		const matchedText = text.toUpperCase();
		setTimeout(() => {
			resolve(DemoTopics.filter(topic => topic.kind !== TopicKind.SYSTEM)
				.filter(topic => topic.type !== TopicType.RAW && topic.type !== TopicType.META)
				.filter(topic => {
					return topic.name.toUpperCase().includes(matchedText)
						|| (topic.factors || []).some(factor => {
							return isIndicatorFactor(factor.type)
								&& ((factor.label || '').toUpperCase().includes(matchedText)
									|| (factor.name || '').toUpperCase().includes(matchedText));
						});
				}));
		}, 500);
	});
};

export const fetchMockSubjectsForIndicatorSelection = async (text: string): Promise<Array<SubjectForIndicator>> => {
	return new Promise<Array<SubjectForIndicator>>(resolve => {
		// const matchedText = text.toUpperCase();
		setTimeout(() => {
			resolve([MOCK_SUBJECT]);
		}, 500);
	});
};

export const fetchMockEnumsForTopic = async (topicId: TopicId): Promise<Array<EnumForIndicator>> => {
	return new Promise<Array<EnumForIndicator>>(async resolve => {
		// eslint-disable-next-line
		const topic = DemoTopics.find(topic => topic.topicId == topicId);
		if (topic == null) {
			resolve([]);
		} else {
			const {data: demoEnums} = await listMockEnums({search: ''});
			const enums = (topic?.factors || []).filter(factor => factor.enumId)
				// eslint-disable-next-line
				.map(factor => demoEnums.find(enumeration => enumeration.enumId == factor.enumId))
				.filter(enumeration => enumeration != null) as Array<EnumForIndicator>;
			resolve(enums);
		}
	});
};

export const fetchMockIndicator = async (indicatorId: IndicatorId): Promise<{ indicator: Indicator; topic?: TopicForIndicator; subject?: SubjectForIndicator; enums?: Array<EnumForIndicator>; }> => {
	// eslint-disable-next-line
	const found = DemoIndicators.find(({indicatorId: id}) => id == indicatorId);
	if (found) {
		const indicator: Indicator = JSON.parse(JSON.stringify(found));
		if (indicator.baseOn === IndicatorBaseOn.TOPIC) {
			// eslint-disable-next-line
			const topic = DemoTopics.find(({topicId: id}) => id == indicator.topicOrSubjectId)!;
			const {data: demoEnums} = await listMockEnums({search: ''});
			const enums = (topic.factors || []).filter(factor => factor.enumId)
				// eslint-disable-next-line
				.map(factor => demoEnums.find(enumeration => enumeration.enumId == factor.enumId))
				.filter(enumeration => enumeration != null) as Array<EnumForIndicator>;
			return {indicator, topic, enums};
			// eslint-disable-next-line
		} else if (indicator.topicOrSubjectId == MOCK_SUBJECT.subjectId) {
			return {indicator, subject: JSON.parse(JSON.stringify(MOCK_SUBJECT))};
		} else {
			const foundSubject = DemoConnectedSpaces
				.filter(connectedSpace => !(connectedSpace.subjects == null || connectedSpace.subjects.length === 0))
				.map(connectedSpace => connectedSpace.subjects)
				.flat()
				// eslint-disable-next-line
				.find(subject => subject.subjectId == indicator.topicOrSubjectId);
			const subject = JSON.parse(JSON.stringify(foundSubject ?? MOCK_SUBJECT));
			return {indicator, subject};
		}
	} else {
		return {
			indicator: {
				...MonthlyOrderPremiumIndicator,
				indicatorId
			},
			topic: MonthlyOrderPremium,
			enums: []
		};
	}
};

let newIndicatorId = 10000;
export const saveMockIndicator = async (indicator: Indicator): Promise<void> => {
	return new Promise<void>((resolve) => {
		if (isFakedUuid(indicator)) {
			indicator.indicatorId = `${newIndicatorId++}`;
		}
		setTimeout(() => resolve(), 500);
	});
};

export const fetchMockRelevantIndicators = async (indicatorId: IndicatorId): Promise<Array<Indicator>> => {
	return new Promise<Array<Indicator>>(resolve => {
		setTimeout(() => {
			resolve(DemoIndicators);
		}, 500);
	});
};

export const fetchMockIndicatorCategories = async (prefix: QueryIndicatorCategoryParams): Promise<Array<string>> => {
	return new Promise<Array<string>>(resolve => {
		setTimeout(() => {
			resolve(['premium', 'order']);
		}, 500);
	});
};

export const listAllMockIndicators = async (): Promise<Array<Indicator>> => {
	return new Promise<Array<Indicator>>(resolve => {
		setTimeout(() => {
			resolve(DemoIndicators);
		}, 500);
	});
};

export const listMockIndicators = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<QueryIndicator>> => {
	const {pageNumber = 1, pageSize = 9} = options;
	return new Promise<TuplePage<QueryIndicator>>((resolve) => {
		setTimeout(() => {
			resolve({
				data: DemoIndicators,
				itemCount: DemoIndicators.length,
				pageNumber,
				pageSize,
				pageCount: 1
			});
		}, 1000);
	});
};
