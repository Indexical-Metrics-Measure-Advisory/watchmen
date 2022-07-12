import {Achievement} from '@/services/data/tuples/achievement-types';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {useEffect, useState} from 'react';
import {useAchievementEventBus} from '../../achievement-event-bus';
import {AchievementEventTypes, AchievementRenderMode} from '../../achievement-event-bus-types';
import {AchievementEditEventBusProvider} from './achievement-edit-event-bus';
import {Editor} from './editor';
import {Viewer} from './viewer';

interface Indicators {
	loaded: boolean;
	data: Array<Indicator>;
}

export const AchievementEditPageBody = (props: { achievement: Achievement }) => {
	const {achievement} = props;

	const [renderMode, setRenderMode] = useState(AchievementRenderMode.EDIT);
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
		{renderMode === AchievementRenderMode.EDIT
			? <Editor achievement={achievement} indicators={indicators.data}/>
			: <Viewer achievement={achievement} indicators={indicators.data}/>}
	</AchievementEditEventBusProvider>;
};