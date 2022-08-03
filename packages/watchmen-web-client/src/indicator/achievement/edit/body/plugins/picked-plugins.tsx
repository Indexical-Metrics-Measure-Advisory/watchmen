import {Achievement} from '@/services/data/tuples/achievement-types';
import {QueryPlugin} from '@/services/data/tuples/query-plugin-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useEffect} from 'react';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {PluginPicker} from './plugin-picker';

export const PickedPlugins = (props: {
	parentId: string;
	achievement: Achievement;
	plugins: Array<QueryPlugin>;
}) => {
	const {parentId, achievement, plugins} = props;

	const {on, off} = useAchievementEditEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onPluginAdded = (anAchievement: Achievement) => {
			// eslint-disable-next-line
			if (anAchievement != achievement) {
				return;
			}
			forceUpdate();
		};
		const onPluginRemoved = (anAchievement: Achievement) => {
			// eslint-disable-next-line
			if (anAchievement != achievement) {
				return;
			}
			forceUpdate();
		};
		on(AchievementEditEventTypes.PLUGIN_ADDED, onPluginAdded);
		on(AchievementEditEventTypes.PLUGIN_REMOVED, onPluginRemoved);
		return () => {
			off(AchievementEditEventTypes.PLUGIN_ADDED, onPluginAdded);
			on(AchievementEditEventTypes.PLUGIN_REMOVED, onPluginRemoved);
		};
	}, [on, off, forceUpdate, achievement]);

	const pluginIds = achievement.pluginIds || [];

	return <>
		{pluginIds.map((pluginId, index) => {
			return <PluginPicker parentId={parentId} achievement={achievement} pluginId={pluginId}
			                     plugins={plugins}
			                     key={`${pluginId}-${index}`}/>;
		})}
	</>;
};