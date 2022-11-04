import {HELP_KEYS, useHelp} from '@/widgets/help';
import React from 'react';
import {AchievementEventBusProvider} from './achievement-event-bus';
import {AchievementRoute} from './route';

const IndicatorAchievementIndex = () => {
	useHelp(HELP_KEYS.IDW_ACHIEVEMENT);

	return <AchievementEventBusProvider>
		<AchievementRoute/>
	</AchievementEventBusProvider>;
};

export default IndicatorAchievementIndex;