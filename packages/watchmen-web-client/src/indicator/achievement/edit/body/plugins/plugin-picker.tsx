import {Achievement} from '@/services/data/tuples/achievement-types';
import {PluginId} from '@/services/data/tuples/plugin-types';
import {QueryPlugin} from '@/services/data/tuples/query-plugin-types';
import {noop} from '@/services/utils';
import {ICON_DELETE, ICON_EXTERNAL_LINK} from '@/widgets/basic/constants';
import {Dropdown} from '@/widgets/basic/dropdown';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useEffect} from 'react';
import {useAchievementEventBus} from '../../../achievement-event-bus';
import {AchievementEventTypes} from '../../../achievement-event-bus-types';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {useCurve} from '../use-curve';
import {computeCurvePath} from '../utils';
import {PluginCurve, PluginNode, PluginNodeContainer, PluginNodeOpener, PluginNodeRemover} from './widgets';

export const PluginPicker = (props: {
	parentId: string;
	achievement: Achievement;
	index: number;
	plugins: Array<QueryPlugin>;
}) => {
	const {parentId, achievement, index, plugins} = props;

	const {fire: fireAchievement} = useAchievementEventBus();
	const {on, off, fire} = useAchievementEditEventBus();
	const {ref, curve} = useCurve(parentId);
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onPluginChanged = (anAchievement: Achievement) => {
			if (anAchievement !== achievement) {
				return;
			}
			forceUpdate();
		};
		on(AchievementEditEventTypes.PLUGIN_CHANGED, onPluginChanged);
		return () => {
			off(AchievementEditEventTypes.PLUGIN_CHANGED, onPluginChanged);
		};
	}, [on, off, forceUpdate, achievement]);

	const onPluginChange = (option: DropdownOption) => {
		const newPluginId = option.value as PluginId;
		// eslint-disable-next-line
		if (newPluginId == achievement.pluginIds![index]) {
			return;
		}

		achievement.pluginIds![index] = newPluginId;
		fire(AchievementEditEventTypes.PLUGIN_CHANGED, achievement);
		fireAchievement(AchievementEventTypes.SAVE_ACHIEVEMENT, achievement, noop);
	};
	// itself and no picked candidates
	const pluginOptions = plugins.filter(plugin => {
		if (plugin.pluginId == achievement.pluginIds![index]) {
			return true;
		}
		// eslint-disable-next-line
		return !(achievement.pluginIds || []).some(pluginId => pluginId == plugin.pluginId);
	}).map(plugin => {
		return {value: plugin.pluginId, label: `${plugin.pluginCode}${plugin.name ? ` - ${plugin.name}` : ''}`};
	});
	const onOpenClicked = () => {
		// TODO open plugin
	};
	const onRemoveClicked = () => {
		achievement.pluginIds = achievement.pluginIds!.filter((_, idx) => idx !== index);
		fire(AchievementEditEventTypes.PLUGIN_REMOVED, achievement);
		fireAchievement(AchievementEventTypes.SAVE_ACHIEVEMENT, achievement, noop);
		setTimeout(() => fire(AchievementEditEventTypes.REPAINT), 100);
	};

	return <PluginNodeContainer>
		<PluginNode ref={ref}>
			<Dropdown value={achievement.pluginIds![index]} options={pluginOptions} onChange={onPluginChange}/>
		</PluginNode>
		<PluginNodeOpener>
			<span onClick={onOpenClicked}><FontAwesomeIcon icon={ICON_EXTERNAL_LINK}/></span>
		</PluginNodeOpener>
		<PluginNodeRemover>
			<span onClick={onRemoveClicked}><FontAwesomeIcon icon={ICON_DELETE}/></span>
		</PluginNodeRemover>
		{curve == null
			? null
			: <PluginCurve rect={curve}>
				<g>
					<path d={computeCurvePath(curve)}/>
				</g>
			</PluginCurve>}
	</PluginNodeContainer>;
};
