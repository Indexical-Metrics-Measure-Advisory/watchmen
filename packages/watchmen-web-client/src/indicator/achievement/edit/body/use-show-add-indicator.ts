import {Achievement} from '@/services/data/tuples/achievement-types';
import {useEffect, useState} from 'react';
import {useAchievementEventBus} from '../../achievement-event-bus';
import {AchievementEventTypes} from '../../achievement-event-bus-types';

export const useShowAddIndicator = (achievement: Achievement) => {
	const {on, off} = useAchievementEventBus();
	const [visible, setVisible] = useState(true);
	useEffect(() => {
		const onSwitchIndicatorCandidates = (aAchievement: Achievement, visible: boolean) => {
			if (aAchievement !== achievement) {
				return;
			}
			setVisible(visible);
		};
		on(AchievementEventTypes.SWITCH_INDICATOR_CANDIDATES, onSwitchIndicatorCandidates);
		return () => {
			off(AchievementEventTypes.SWITCH_INDICATOR_CANDIDATES, onSwitchIndicatorCandidates);
		};
	}, [on, off, achievement]);

	return visible;
};