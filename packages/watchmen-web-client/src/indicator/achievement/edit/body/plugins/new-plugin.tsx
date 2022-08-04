import {Achievement} from '@/services/data/tuples/achievement-types';
import {PluginId} from '@/services/data/tuples/plugin-types';
import {QueryPlugin} from '@/services/data/tuples/query-plugin-types';
import {noop} from '@/services/utils';
import {Dropdown} from '@/widgets/basic/dropdown';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {useEffect} from 'react';
import {useAchievementEventBus} from '../../../achievement-event-bus';
import {AchievementEventTypes} from '../../../achievement-event-bus-types';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {useCurve} from '../use-curve';
import {computeCurvePath} from '../utils';
import {PluginCurve, PluginNode, PluginNodeContainer} from './widgets';

const hasMore = (achievement: Achievement, plugins: Array<QueryPlugin>) => {
	const pluginIds = achievement.pluginIds || [];
	return plugins.filter(plugin => {
		// eslint-disable-next-line
		return !pluginIds.some(pluginId => pluginId != plugin.pluginId);
	}).length !== 0;
};

export const NewPlugin = (props: {
	parentId: string;
	achievement: Achievement;
	plugins: Array<QueryPlugin>;
}) => {
	const {parentId, achievement, plugins} = props;

	const {fire: fireAchievement} = useAchievementEventBus();
	const {on, off, fire} = useAchievementEditEventBus();
	const {ref, curve} = useCurve(parentId);
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onPluginChanged = (anAchievement: Achievement) => anAchievement === achievement && forceUpdate();
		const onPluginRemoved = (anAchievement: Achievement) => anAchievement === achievement && forceUpdate();
		on(AchievementEditEventTypes.PLUGIN_CHANGED, onPluginChanged);
		on(AchievementEditEventTypes.PLUGIN_REMOVED, onPluginRemoved);
		return () => {
			off(AchievementEditEventTypes.PLUGIN_CHANGED, onPluginChanged);
			off(AchievementEditEventTypes.PLUGIN_REMOVED, onPluginRemoved);
		};
	}, [on, off, forceUpdate, achievement]);

	if (!hasMore(achievement, plugins)) {
		return null;
	}

	const onPluginChange = (option: DropdownOption) => {
		const pluginId = option.value as PluginId;
		if (achievement.pluginIds == null) {
			achievement.pluginIds = [];
		}
		achievement.pluginIds.push(pluginId);
		fire(AchievementEditEventTypes.PLUGIN_ADDED, achievement);
		fireAchievement(AchievementEventTypes.SAVE_ACHIEVEMENT, achievement, noop);
		forceUpdate();
		setTimeout(() => fire(AchievementEditEventTypes.REPAINT), 100);
	};
	// not picked candidates only
	const pluginOptions = plugins.filter(plugin => {
		// eslint-disable-next-line
		return !(achievement.pluginIds || []).some(pluginId => pluginId == plugin.pluginId);
	}).map(plugin => {
		return {value: plugin.pluginId, label: `${plugin.pluginCode}${plugin.name ? ` - ${plugin.name}` : ''}`};
	});

	return <PluginNodeContainer data-new-plugin="true">
		<PluginNode ref={ref}>
			<Dropdown value={''} options={pluginOptions} onChange={onPluginChange}
			          please={Lang.INDICATOR.ACHIEVEMENT.PLEASE_SELECT_PLUGIN}/>
		</PluginNode>
		{curve == null
			? null
			: <PluginCurve rect={curve}>
				<g>
					<path d={computeCurvePath(curve)}/>
				</g>
			</PluginCurve>}
	</PluginNodeContainer>;
};