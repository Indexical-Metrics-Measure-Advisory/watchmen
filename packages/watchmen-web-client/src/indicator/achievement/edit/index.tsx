import {fetchAchievement} from '@/services/data/tuples/achievement';
import {Achievement, AchievementId} from '@/services/data/tuples/achievement-types';
import {FullWidthPage} from '@/widgets/basic/page';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import React, {useEffect, useState} from 'react';
import {useParams} from 'react-router-dom';
import {useAchievementEventBus} from '../achievement-event-bus';
import {AchievementEventTypes} from '../achievement-event-bus-types';
import {AchievementEditPageBody} from './body';
import {AchievementEditPageHeader} from './header';
import {AchievementSaver} from './saver';

const InternalAchievementEdit = (props: { achievement: Achievement }) => {
	const {achievement} = props;

	return <FullWidthPage>
		<AchievementEditPageHeader achievement={achievement}/>
		<AchievementEditPageBody achievement={achievement}/>
		<AchievementSaver achievement={achievement}/>
	</FullWidthPage>;
};

export const AchievementEdit = () => {
	const achievementId = useParams<{ achievementId: AchievementId }>().achievementId!;
	const {fire: fireGlobal} = useEventBus();
	const {fire} = useAchievementEventBus();
	const [achievement, setAchievement] = useState<Achievement | null>(null);
	useEffect(() => {
		// eslint-disable-next-line
		if (achievement != null && achievement.achievementId == achievementId) {
			return;
		}
		fire(AchievementEventTypes.ASK_ACHIEVEMENT, (aAchievement?: Achievement) => {
			if (aAchievement === achievement) {
				return;
			}
			// eslint-disable-next-line
			if (aAchievement == null || aAchievement.achievementId != achievementId) {
				// not in memory yet, or not same one
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => {
						const {achievement} = await fetchAchievement(achievementId);
						return {tuple: achievement};
					},
					({tuple}) => {
						setAchievement(tuple as Achievement);
						fire(AchievementEventTypes.ACHIEVEMENT_PICKED, tuple as Achievement);
					});
			} else {
				setAchievement(aAchievement);
			}
		});
	}, [fire, fireGlobal, achievement, achievementId]);

	return achievement == null ? null : <InternalAchievementEdit achievement={achievement}/>;
};