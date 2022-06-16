import {TuplePage} from '../../query/tuple-page';
import {Achievement, AchievementId, AchievementIndicator} from '../../tuples/achievement-types';
import {QueryAchievement} from '../../tuples/query-achievement-types';
import {isFakedUuid} from '../../tuples/utils';
import {getCurrentTime} from '../../utils';
import {DemoQueryAchievements} from './mock-data-achievements';

export const listMockAchievements = async (options: {
	search: string;
	pageNumber?: number;
	pageSize?: number;
}): Promise<TuplePage<QueryAchievement>> => {
	const {pageNumber = 1, pageSize = 9} = options;
	return new Promise<TuplePage<QueryAchievement>>((resolve) => {
		setTimeout(() => {
			resolve({
				data: DemoQueryAchievements,
				itemCount: DemoQueryAchievements.length,
				pageNumber,
				pageSize,
				pageCount: 1
			});
		}, 1000);
	});
};

export const fetchMockAchievement = async (achievementId: AchievementId): Promise<{ achievement: Achievement }> => {
	let achievement: Achievement;

	// eslint-disable-next-line
	const found = DemoQueryAchievements.find(({achievementId: id}) => id == achievementId);
	if (found) {
		achievement = JSON.parse(JSON.stringify(found));
	} else {
		achievement = {
			achievementId,
			name: 'Mock Achievement',
			createdAt: getCurrentTime(),
			lastModifiedAt: getCurrentTime()
		} as Achievement;
	}
	return {achievement};
};

let newAchievementId = 10000;
export const saveMockAchievement = async (achievement: Achievement): Promise<void> => {
	return new Promise<void>((resolve) => {
		if (isFakedUuid(achievement)) {
			achievement.achievementId = `${newAchievementId++}`;
		}
		setTimeout(() => resolve(), 500);
	});
};

export const fetchMockAchievementIndicatorData = async (current: AchievementIndicator, previous?: AchievementIndicator): Promise<{ current?: number, previous?: number }> => {
	return new Promise<{ current?: number, previous?: number }>(resolve => {
		setTimeout(() => {
			const current = 500 + Math.random() * 500;
			const previous = current * (5 + Math.random() * 5) * 0.1;
			resolve({current, previous});
		}, 500);
	});
};
