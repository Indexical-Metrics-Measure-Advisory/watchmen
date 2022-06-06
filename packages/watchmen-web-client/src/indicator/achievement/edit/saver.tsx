import {SAVE_TIMEOUT} from '@/services/constants';
import {saveAchievement} from '@/services/data/tuples/achievement';
import {Achievement} from '@/services/data/tuples/achievement-types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {useThrottler} from '@/widgets/throttler';
import {Fragment, useEffect} from 'react';
import {useAchievementEventBus} from '../achievement-event-bus';
import {AchievementEventTypes} from '../achievement-event-bus-types';

export const AchievementSaver = (props: { achievement: Achievement }) => {
	const {achievement} = props;

	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useAchievementEventBus();
	const saveQueue = useThrottler();
	useEffect(() => saveQueue.clear(true), [achievement, saveQueue]);
	useEffect(() => {
		const onSaveAchievement = (aAchievement: Achievement, onSaved: (achievement: Achievement, saved: boolean) => void) => {
			if (aAchievement !== achievement) {
				return;
			}

			saveQueue.replace(() => {
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => await saveAchievement(achievement),
					() => {
						fire(AchievementEventTypes.ACHIEVEMENT_SAVED, achievement);
						onSaved(achievement, true);
					}, () => {
						onSaved(achievement, false);
					});
			}, SAVE_TIMEOUT);
		};
		on(AchievementEventTypes.NAME_CHANGED, onSaveAchievement);
		on(AchievementEventTypes.SAVE_ACHIEVEMENT, onSaveAchievement);
		return () => {
			off(AchievementEventTypes.NAME_CHANGED, onSaveAchievement);
			off(AchievementEventTypes.SAVE_ACHIEVEMENT, onSaveAchievement);
		};
	}, [fireGlobal, on, off, fire, saveQueue, achievement]);

	return <Fragment/>;
};