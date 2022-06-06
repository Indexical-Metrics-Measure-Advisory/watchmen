import AchievementBackground from '@/assets/achievement-background.svg';
import {TuplePage} from '@/services/data/query/tuple-page';
import {fetchAchievement, listAchievements, saveAchievement} from '@/services/data/tuples/achievement';
import {Achievement} from '@/services/data/tuples/achievement-types';
import {QueryAchievement} from '@/services/data/tuples/query-achievement-types';
import {QueryTuple} from '@/services/data/tuples/tuple-types';
import {noop} from '@/services/utils';
import {TUPLE_SEARCH_PAGE_SIZE} from '@/widgets/basic/constants';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {TupleWorkbench} from '@/widgets/tuple-workbench';
import {TupleEventBusProvider, useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import React, {Fragment, useEffect} from 'react';
import {useAchievementEventBus} from '../achievement-event-bus';
import {AchievementEventTypes} from '../achievement-event-bus-types';
import {createAchievement} from '../utils';
import {renderCard} from './card';

const getKeyOfAchievement = (achievement: QueryAchievement) => achievement.achievementId;

// editor never used here
const InternalAchievementQuery = () => {
	const {fire: fireGlobal} = useEventBus();
	const {fire: fireAchievement} = useAchievementEventBus();
	const {on, off, fire} = useTupleEventBus();
	useEffect(() => {
		const onDoCreateAchievement = async () => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => {
					const achievement = createAchievement();
					await saveAchievement(achievement);
					return achievement;
				},
				(achievement: Achievement) => {
					fireAchievement(AchievementEventTypes.TO_EDIT_ACHIEVEMENT, achievement);
				});
		};
		const onDoEditAchievement = async (queryAchievement: QueryAchievement) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => {
					const {achievement} = await fetchAchievement(queryAchievement.achievementId);
					return {tuple: achievement};
				},
				({tuple}) => {
					fireAchievement(AchievementEventTypes.TO_EDIT_ACHIEVEMENT, tuple as Achievement);
				});
		};
		const onDoSearchAchievement = async (searchText: string, pageNumber: number) => {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
				async () => await listAchievements({search: searchText, pageNumber, pageSize: TUPLE_SEARCH_PAGE_SIZE}),
				(page: TuplePage<QueryTuple>) => {
					fire(TupleEventTypes.TUPLE_SEARCHED, page, searchText);
					fireAchievement(AchievementEventTypes.ACHIEVEMENT_SEARCHED, page, searchText);
				});
		};
		// do nothing for save achievement, see edit page
		const onSaveAchievement = noop;

		on(TupleEventTypes.DO_CREATE_TUPLE, onDoCreateAchievement);
		on(TupleEventTypes.DO_EDIT_TUPLE, onDoEditAchievement);
		on(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchAchievement);
		on(TupleEventTypes.SAVE_TUPLE, onSaveAchievement);
		return () => {
			off(TupleEventTypes.DO_CREATE_TUPLE, onDoCreateAchievement);
			off(TupleEventTypes.DO_EDIT_TUPLE, onDoEditAchievement);
			off(TupleEventTypes.DO_SEARCH_TUPLE, onDoSearchAchievement);
			off(TupleEventTypes.SAVE_TUPLE, onSaveAchievement);
		};
	}, [on, off, fire, fireGlobal, fireAchievement]);
	useEffect(() => {
		fireAchievement(AchievementEventTypes.ASK_ACHIEVEMENT_QUERY_PAGE_DATA, (page?: TuplePage<QueryTuple>, searchText?: string) => {
			if (page != null) {
				fire(TupleEventTypes.TUPLE_SEARCHED, page, searchText ?? '');
			}
		});
		// only ask on mount
	}, [fire, fireAchievement]);

	return <TupleWorkbench title={Lang.INDICATOR_WORKBENCH.ACHIEVEMENT.TITLE}
	                       createButtonLabel={Lang.INDICATOR_WORKBENCH.ACHIEVEMENT.CREATE_ACHIEVEMENT} canCreate={true}
	                       searchPlaceholder={Lang.PLAIN.FIND_ACHIEVEMENT_PLACEHOLDER}
	                       tupleLabel={Lang.INDICATOR_WORKBENCH.ACHIEVEMENT.LABEL}
	                       newTupleLabelPrefix={Lang.INDICATOR_WORKBENCH.ACHIEVEMENT.NEW_ACHIEVEMENT_PREFIX}
	                       existingTupleLabelPrefix={Lang.INDICATOR_WORKBENCH.ACHIEVEMENT.EXISTING_ACHIEVEMENT_PREFIX}
	                       tupleImage={AchievementBackground} tupleImagePosition="left 120px"
	                       renderEditor={() => <Fragment/>}
	                       confirmEditButtonLabel={Lang.ACTIONS.CONFIRM}
	                       closeEditButtonLabel={Lang.ACTIONS.CLOSE}
	                       renderCard={renderCard} getKeyOfTuple={getKeyOfAchievement}
	/>;
};

export const AchievementQuery = () => {
	return <TupleEventBusProvider>
		<InternalAchievementQuery/>
	</TupleEventBusProvider>;
};