import {findAccount} from '../account';
import {Apis, get, page, post} from '../apis';
import {
	fetchMockEnumsForTopic,
	fetchMockIndicator,
	fetchMockIndicatorCategories,
	fetchMockIndicatorsForSelection,
	fetchMockRelevantIndicators,
	fetchMockSubjectsForIndicatorSelection,
	fetchMockTopicsForIndicatorSelection,
	listAllMockIndicators,
	listMockIndicators,
	saveMockIndicator
} from '../mock/tuples/mock-indicator';
import {TuplePage} from '../query/tuple-page';
import {isMockService} from '../utils';
import {Indicator, IndicatorBaseOn, IndicatorId} from './indicator-types';
import {
	EnumForIndicator,
	QueryIndicator,
	QueryIndicatorCategoryParams,
	SubjectForIndicator,
	TopicForIndicator
} from './query-indicator-types';
import {TopicId} from './topic-types';
import {UserGroupId} from './user-group-types';
import {isFakedUuid} from './utils';

type IndicatorOnServer = Omit<Indicator, 'userGroupIds'> & { groupIds: Array<UserGroupId> };
const transformFromServer = (indicator: IndicatorOnServer): Indicator => {
	const {groupIds, ...rest} = indicator;
	return {userGroupIds: groupIds, ...rest};
};
const transformToServer = (indicator: Indicator): IndicatorOnServer => {
	const {userGroupIds, ...rest} = indicator;
	return {groupIds: userGroupIds, ...rest};
};

export const listIndicators = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<QueryIndicator>> => {
	const {search = '', pageNumber = 1, pageSize = 9} = options;

	if (isMockService()) {
		return listMockIndicators(options);
	} else {
		return await page({api: Apis.INDICATOR_LIST_BY_NAME, search: {search}, pageable: {pageNumber, pageSize}});
	}
};

export const fetchIndicatorsForSelection = async (search: string): Promise<Array<QueryIndicator>> => {
	if (isMockService()) {
		return await fetchMockIndicatorsForSelection(search.trim());
	} else {
		return await get({api: Apis.INDICATOR_LIST_FOR_SELECTION, search: {search}});
	}
};

export const fetchTopicsForIndicatorSelection = async (search: string): Promise<Array<TopicForIndicator>> => {
	if (isMockService()) {
		return await fetchMockTopicsForIndicatorSelection(search.trim());
	} else {
		return await get({api: Apis.TOPIC_LIST_FOR_INDICATOR_SELECTION, search: {search}});
	}
};

export const fetchSubjectsForIndicatorSelection = async (search: string): Promise<Array<SubjectForIndicator>> => {
	if (isMockService()) {
		return await fetchMockSubjectsForIndicatorSelection(search.trim());
	} else {
		return await get({api: Apis.SUBJECT_LIST_FOR_INDICATOR_SELECTION, search: {search}});
	}
};

export const fetchEnumsForTopic = async (topicId: TopicId): Promise<Array<EnumForIndicator>> => {
	if (isMockService()) {
		return await fetchMockEnumsForTopic(topicId);
	} else {
		return await get({api: Apis.ENUM_LIST_FOR_INDICATOR_TOPIC, search: {topicId}});
	}
};

export const fetchIndicator = async (indicatorId: IndicatorId): Promise<{ indicator: Indicator; topic?: TopicForIndicator; subject?: SubjectForIndicator; enums?: Array<EnumForIndicator>; }> => {
	if (isMockService()) {
		return await fetchMockIndicator(indicatorId);
	} else {
		const indicator: IndicatorOnServer = await get({api: Apis.INDICATOR_GET, search: {indicatorId}});
		let topic: TopicForIndicator | undefined = (void 0);
		let subject: SubjectForIndicator | undefined = (void 0);
		if (indicator.baseOn === IndicatorBaseOn.TOPIC) {
			topic = await get({api: Apis.TOPIC_GET, search: {topicId: indicator.topicOrSubjectId}});
		} else if (indicator.baseOn === IndicatorBaseOn.SUBJECT) {
			subject = await get({api: Apis.SUBJECT_FOR_INDICATOR_GET, search: {subjectId: indicator.topicOrSubjectId}});
		}
		return {indicator: transformFromServer(indicator), topic, subject};
	}
};

export const saveIndicator = async (indicator: Indicator): Promise<void> => {
	indicator.tenantId = findAccount()?.tenantId;
	if (isMockService()) {
		return saveMockIndicator(indicator);
	} else if (isFakedUuid(indicator)) {
		const data = await post({api: Apis.INDICATOR_CREATE, data: indicator});
		indicator.indicatorId = data.indicatorId;
		indicator.tenantId = data.tenantId;
		indicator.version = data.version;
		indicator.lastModifiedAt = data.lastModifiedAt;
	} else {
		const data = await post({
			api: Apis.INDICATOR_SAVE,
			data: transformToServer(indicator)
		});
		indicator.tenantId = data.tenantId;
		indicator.version = data.version;
		indicator.lastModifiedAt = data.lastModifiedAt;
	}
};

export const fetchRelevantIndicators = async (indicatorId: IndicatorId): Promise<Array<Indicator>> => {
	if (isMockService()) {
		return fetchMockRelevantIndicators(indicatorId);
	} else {
		return await get({api: Apis.RELEVANT_INDICATOR_LIST, search: {indicatorId}});
	}
};

/**
 * @param prefix {@code []} for load category1, {@code [string]} for load category2,
 *              {@code [string, string]} for load category3
 */
export const loadIndicatorCategories = async (prefix: QueryIndicatorCategoryParams): Promise<Array<string>> => {
	if (isMockService()) {
		return fetchMockIndicatorCategories(prefix);
	} else {
		return await post({api: Apis.INDICATOR_CATEGORIES, data: prefix});
	}
};

export const listAllIndicators = async (): Promise<Array<Indicator>> => {
	if (isMockService()) {
		return listAllMockIndicators();
	} else {
		const indicators: Array<IndicatorOnServer> = await get({api: Apis.INDICATORS_LIST});
		return (indicators || []).map(indicator => transformFromServer(indicator));
	}
};