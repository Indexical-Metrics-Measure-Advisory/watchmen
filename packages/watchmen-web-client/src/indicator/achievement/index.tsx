import React from 'react';
import {AchievementEventBusProvider} from './achievement-event-bus';
import {AchievementRoute} from './route';

const IndicatorAchievementIndex = () => {
	return <AchievementEventBusProvider>
		<AchievementRoute/>
	</AchievementEventBusProvider>;
};

export default IndicatorAchievementIndex;