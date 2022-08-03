import {Achievement} from '@/services/data/tuples/achievement-types';
import {PluginId} from '@/services/data/tuples/plugin-types';
import {QueryPlugin} from '@/services/data/tuples/query-plugin-types';
import {noop} from '@/services/utils';
import {ICON_DELETE, ICON_EXTERNAL_LINK} from '@/widgets/basic/constants';
import {Dropdown} from '@/widgets/basic/dropdown';
import {DropdownOption} from '@/widgets/basic/types';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
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
	pluginId: PluginId;
	index: number;
	plugins: Array<QueryPlugin>;
}) => {
	const {parentId, achievement, pluginId, index, plugins} = props;

	const {fire: fireAchievement} = useAchievementEventBus();
	const {fire} = useAchievementEditEventBus();
	const {ref, curve} = useCurve(parentId);

	const onPluginChange = (option: DropdownOption) => {
		const newPluginId = option.value as PluginId;
		// eslint-disable-next-line
		if (newPluginId == pluginId) {
			return;
		}

		achievement.pluginIds!.push(newPluginId);
		fire(AchievementEditEventTypes.PLUGIN_CHANGED, achievement);
		fireAchievement(AchievementEventTypes.SAVE_ACHIEVEMENT, achievement, noop);
	};
	const pluginOptions = plugins.map(plugin => {
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
			<Dropdown value={pluginId} options={pluginOptions} onChange={onPluginChange}/>
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
