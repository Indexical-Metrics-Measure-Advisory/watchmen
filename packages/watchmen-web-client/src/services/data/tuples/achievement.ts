import {findAccount} from '../../data/account';
import {Apis, get, page, post} from '../../data/apis';
import {isMockService} from '../../data/utils';
import {
	fetchMockAchievement,
	fetchMockAchievementIndicatorData,
	listMockAchievements,
	saveMockAchievement
} from '../mock/tuples/mock-achievement';
import {TuplePage} from '../query/tuple-page';
import {Achievement, AchievementId, AchievementIndicator} from './achievement-types';
import {QueryAchievement} from './query-achievement-types';
import {isFakedUuid} from './utils';

export const listAchievements = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<QueryAchievement>> => {
	const {search = '', pageNumber = 1, pageSize = 9} = options;

	if (isMockService()) {
		return listMockAchievements(options);
	} else {
		return await page({api: Apis.ACHIEVEMENT_LIST_BY_NAME, search: {search}, pageable: {pageNumber, pageSize}});
	}
};

export const fetchAchievement = async (achievementId: AchievementId): Promise<{ achievement: Achievement }> => {
	if (isMockService()) {
		return fetchMockAchievement(achievementId);
	} else {
		const achievement = await get({api: Apis.ACHIEVEMENT_GET, search: {achievementId}});
		(achievement.indicators || []).forEach((indicator: AchievementIndicator, index: number, array: Array<AchievementIndicator>) => {
			if (indicator.variableName == null || indicator.variableName.trim().length === 0) {
				let startIndex = index + 1;
				while (true) {
					const variableName = `v${startIndex}`;
					if (array.every(({variableName: vn}) => vn !== variableName)) {
						indicator.variableName = variableName;
						break;
					} else {
						startIndex += 1;
					}
				}
			}
		});
		return {achievement};
	}
};

export const saveAchievement = async (achievement: Achievement): Promise<void> => {
	achievement.tenantId = findAccount()?.tenantId;
	if (isMockService()) {
		return saveMockAchievement(achievement);
	} else if (isFakedUuid(achievement)) {
		const data = await post({api: Apis.ACHIEVEMENT_CREATE, data: achievement});
		achievement.achievementId = data.achievementId;
		achievement.tenantId = data.tenantId;
		achievement.lastModifiedAt = data.lastModifiedAt;
	} else {
		const data = await post({
			api: Apis.ACHIEVEMENT_SAVE,
			data: achievement
		});
		achievement.tenantId = data.tenantId;
		achievement.lastModifiedAt = data.lastModifiedAt;
	}
};

export const fetchAchievementIndicatorData = async (current: AchievementIndicator, previous?: AchievementIndicator): Promise<{ current?: number, previous?: number }> => {
	if (isMockService()) {
		return fetchMockAchievementIndicatorData(current, previous);
	} else {
		const {current: currentData, previous: previousData} = await post({
			api: Apis.ACHIEVEMENT_INDICATOR_DATA,
			data: {current, previous}
		});
		return {current: currentData, previous: previousData};
	}
};
