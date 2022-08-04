import {Achievement} from '@/services/data/tuples/achievement-types';
import {QueryPlugin} from '@/services/data/tuples/query-plugin-types';
import {useEffect, useState} from 'react';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {NoPluginAssistant} from './widgets';

const hasPicked = (achievement: Achievement) => {
	return achievement.pluginIds != null && achievement.pluginIds.length !== 0;
};

export const NoPluginAssist = (props: {
	achievement: Achievement;
	plugins: Array<QueryPlugin>;
}) => {
	const {achievement, plugins} = props;

	const {on, off} = useAchievementEditEventBus();
	const [picked, setPicked] = useState(false);
	useEffect(() => {
		const onPluginAdded = (anAchievement: Achievement) => anAchievement === achievement && setPicked(hasPicked(achievement));
		const onPluginRemoved = (anAchievement: Achievement) => anAchievement === achievement && setPicked(hasPicked(achievement));
		on(AchievementEditEventTypes.PLUGIN_ADDED, onPluginAdded);
		on(AchievementEditEventTypes.PLUGIN_REMOVED, onPluginRemoved);
		return () => {
			off(AchievementEditEventTypes.PLUGIN_ADDED, onPluginAdded);
			off(AchievementEditEventTypes.PLUGIN_REMOVED, onPluginRemoved);
		};
	}, [on, off, achievement]);
	useEffect(() => {
		if (plugins.length === 0) {
			setPicked(false);
		} else {
			setPicked(hasPicked(achievement));
		}
	}, [achievement, plugins]);

	return <NoPluginAssistant data-has-plugin={picked}/>;
};