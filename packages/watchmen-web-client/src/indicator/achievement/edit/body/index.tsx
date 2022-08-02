import {Achievement} from '@/services/data/tuples/achievement-types';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {useEffect, useState} from 'react';
import {useAchievementEventBus} from '../../achievement-event-bus';
import {AchievementEventTypes, AchievementRenderMode} from '../../achievement-event-bus-types';
import {AchievementEditEventBusProvider} from './achievement-edit-event-bus';
import {Palette} from './palette';

interface Indicators {
	loaded: boolean;
	data: Array<Indicator>;
}

export const AchievementEditPageBody = (props: {
	achievement: Achievement;
	startOnRenderMode?: AchievementRenderMode;
}) => {
	const {achievement, startOnRenderMode = AchievementRenderMode.EDIT} = props;

	const [renderMode, setRenderMode] = useState(startOnRenderMode);
	const [indicators, setIndicators] = useState<Indicators>({loaded: false, data: []});
	const {on, off, fire} = useAchievementEventBus();
	useEffect(() => {
		fire(AchievementEventTypes.ASK_INDICATORS, (indicators: Array<Indicator>) => {
			setIndicators({loaded: true, data: indicators});
		});
	}, [fire, achievement]);
	useEffect(() => {
		const onSwitchRenderMode = (anAchievement: Achievement, mode: AchievementRenderMode) => {
			if (anAchievement !== achievement) {
				return;
			}
			setRenderMode(mode);
		};
		on(AchievementEventTypes.SWITCH_RENDER_MODE, onSwitchRenderMode);
		return () => {
			off(AchievementEventTypes.SWITCH_RENDER_MODE, onSwitchRenderMode);
		};
	}, [on, off, achievement]);

	if (!indicators.loaded) {
		return null;
	}

	return <AchievementEditEventBusProvider>
		<Palette achievement={achievement} indicators={indicators.data} renderMode={renderMode}/>
	</AchievementEditEventBusProvider>;
};