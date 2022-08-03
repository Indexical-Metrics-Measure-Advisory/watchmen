import {Achievement} from '@/services/data/tuples/achievement-types';
import {PluginId} from '@/services/data/tuples/plugin-types';
import {QueryPlugin} from '@/services/data/tuples/query-plugin-types';
import {noop} from '@/services/utils';
import {Dropdown} from '@/widgets/basic/dropdown';
import {DropdownOption} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import {useEffect, useState} from 'react';
import {useAchievementEventBus} from '../../../achievement-event-bus';
import {AchievementEventTypes} from '../../../achievement-event-bus-types';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {useCurve} from '../use-curve';
import {computeCurvePath} from '../utils';
import {PluginCurve, PluginNode, PluginNodeContainer} from './widgets';

export const NewPlugin = (props: {
	parentId: string;
	achievement: Achievement;
	plugins: Array<QueryPlugin>;
	expanded: boolean;
}) => {
	const {parentId, achievement, plugins, expanded} = props;

	const {fire: fireAchievement} = useAchievementEventBus();
	const {on, off, fire} = useAchievementEditEventBus();
	const [visible, setVisible] = useState(false);
	const {ref, curve} = useCurve(parentId);
	useEffect(() => {
		const onAddPlugin = (anAchievement: Achievement) => {
			if (anAchievement !== achievement) {
				return;
			}
			setVisible(true);
		};
		on(AchievementEditEventTypes.ADD_PLUGIN, onAddPlugin);
		return () => {
			off(AchievementEditEventTypes.ADD_PLUGIN, onAddPlugin);
		};
	}, [on, off, achievement]);

	if (!visible || !expanded) {
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
		setVisible(false);
	};
	const pluginOptions = plugins.map(plugin => {
		return {value: plugin.pluginId, label: `${plugin.pluginCode}${plugin.name ? ` - ${plugin.name}` : ''}`};
	});

	return <PluginNodeContainer>
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