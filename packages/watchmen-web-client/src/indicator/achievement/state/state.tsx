import {Router} from '@/routes/types';
import {toAchievementEdit} from '@/routes/utils';
import {TuplePage} from '@/services/data/query/tuple-page';
import {Achievement} from '@/services/data/tuples/achievement-types';
import {QueryAchievement} from '@/services/data/tuples/query-achievement-types';
import {QueryTuple} from '@/services/data/tuples/tuple-types';
import {Fragment, useEffect, useState} from 'react';
import {useHistory} from 'react-router-dom';
import {useAchievementEventBus} from '../achievement-event-bus';
import {AchievementEventTypes} from '../achievement-event-bus-types';

interface PageData {
	loaded: boolean;
	data?: TuplePage<QueryTuple>;
	searchText?: string;
}

export const AchievementState = () => {
	const history = useHistory();
	const {on, off, fire} = useAchievementEventBus();
	const [page, setPage] = useState<PageData>({loaded: false});
	const [achievement, setAchievement] = useState<Achievement | null>(null);

	useEffect(() => {
		const onAchievementPicked = (achievement: Achievement) => {
			setAchievement(achievement);
		};
		on(AchievementEventTypes.ACHIEVEMENT_PICKED, onAchievementPicked);
		return () => {
			off(AchievementEventTypes.ACHIEVEMENT_PICKED, onAchievementPicked);
		};
	}, [on, off]);
	useEffect(() => {
		const onAchievementSearched = (page: TuplePage<QueryTuple>, searchText: string) => {
			setPage({loaded: true, data: page, searchText});
		};
		on(AchievementEventTypes.ACHIEVEMENT_SEARCHED, onAchievementSearched);
		return () => {
			off(AchievementEventTypes.ACHIEVEMENT_SEARCHED, onAchievementSearched);
		};
	}, [on, off]);
	useEffect(() => {
		const onToEditAchievement = (achievement: Achievement) => {
			setAchievement(achievement);
			history.push(toAchievementEdit(achievement.achievementId));
		};
		on(AchievementEventTypes.TO_EDIT_ACHIEVEMENT, onToEditAchievement);
		return () => {
			off(AchievementEventTypes.TO_EDIT_ACHIEVEMENT, onToEditAchievement);
		};
	}, [on, off, fire, history]);
	useEffect(() => {
		const onAskAchievement = (onData: (achievement?: Achievement) => void) => {
			onData(achievement == null ? (void 0) : achievement);
		};
		on(AchievementEventTypes.ASK_ACHIEVEMENT, onAskAchievement);
		return () => {
			off(AchievementEventTypes.ASK_ACHIEVEMENT, onAskAchievement);
		};
	}, [on, off, achievement]);
	useEffect(() => {
		const onAskAchievementPage = (onData: (page?: TuplePage<QueryTuple>, searchText?: string) => void) => {
			if (page.loaded) {
				onData(page.data, page.searchText);
			} else {
				onData();
			}
		};
		on(AchievementEventTypes.ASK_ACHIEVEMENT_QUERY_PAGE_DATA, onAskAchievementPage);
		return () => {
			off(AchievementEventTypes.ASK_ACHIEVEMENT_QUERY_PAGE_DATA, onAskAchievementPage);
		};
	}, [on, off, page.loaded, page.data, page.searchText]);
	useEffect(() => {
		const onBackToQuery = () => {
			setAchievement(null);
			history.push(Router.INDICATOR_ACHIEVEMENT_QUERY);
		};
		on(AchievementEventTypes.BACK_TO_QUERY, onBackToQuery);
		return () => {
			off(AchievementEventTypes.BACK_TO_QUERY, onBackToQuery);
		};
	}, [on, off, history]);
	useEffect(() => {
		const onAchievementSaved = (achievement: Achievement) => {
			if (!page.loaded || page.data == null) {
				return;
			}
			// eslint-disable-next-line
			const found = page.data.data.find(nav => (nav as QueryAchievement).achievementId == achievement.achievementId) as (QueryAchievement | undefined);
			if (found != null) {
				found.name = achievement.name;
				found.lastModifiedAt = achievement.lastModifiedAt;
			}
		};
		on(AchievementEventTypes.ACHIEVEMENT_SAVED, onAchievementSaved);
		return () => {
			off(AchievementEventTypes.ACHIEVEMENT_SAVED, onAchievementSaved);
		};
	}, [on, off, page.loaded, page.data]);

	return <Fragment/>;
};