import {Achievement} from '@/services/data/tuples/achievement-types';
import {QueryPlugin} from '@/services/data/tuples/query-plugin-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {ICON_EXPAND_NODES} from '@/widgets/basic/constants';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {useEffect, useState} from 'react';
import {v4} from 'uuid';
import {useAchievementEventBus} from '../../../achievement-event-bus';
import {AchievementEventTypes} from '../../../achievement-event-bus-types';
import {useAchievementEditEventBus} from '../achievement-edit-event-bus';
import {AchievementEditEventTypes} from '../achievement-edit-event-bus-types';
import {useCurve} from '../use-curve';
import {computeCurvePath} from '../utils';
import {NewPlugin} from './new-plugin';
import {PickedPlugins} from './picked-plugins';
import {PluginCurve, PluginsContainer, PluginsRootColumn, PluginsRootNode, PluginsRootNodeContainer} from './widgets';

interface PluginsState {
	loaded: boolean;
	data: Array<QueryPlugin>;
}

export const Plugins = (props: {
	paletteId: string;
	parentId: string;
	achievement: Achievement;
}) => {
	const {parentId, achievement} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire: fireAchievement} = useAchievementEventBus();
	const {fire} = useAchievementEditEventBus();
	const [state, setState] = useState<PluginsState>({loaded: false, data: []});
	const {ref, curve} = useCurve(parentId);
	const [id] = useState(v4());
	const [expanded, setExpanded] = useState(false);
	useEffect(() => {
		fire(AchievementEditEventTypes.REPAINT);
	}, [fire, expanded]);
	useEffect(() => {
		if (!state.loaded) {
			fireAchievement(AchievementEventTypes.ASK_PLUGINS, (plugins: Array<QueryPlugin>) => {
				setState({loaded: true, data: plugins});
			});
		}
	}, [fireAchievement, achievement, state.loaded]);

	const onMoreClicked = () => {
		const hasMore = () => {
			if (state.data.length === 0) {
				return false;
			}
			const pluginIds = achievement.pluginIds || [];
			// eslint-disable-next-line
			return state.data.some(plugin => !pluginIds.some(pluginId => pluginId == plugin.pluginId));
		};
		if (!hasMore()) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
				{Lang.INDICATOR.ACHIEVEMENT.NO_PLUGIN_CANDIDATE}
			</AlertLabel>);
			return;
		}

		fire(AchievementEditEventTypes.ADD_PLUGIN, achievement);
		setExpanded(!expanded);
	};

	return <PluginsContainer>
		<PluginsRootColumn>
			<PluginsRootNodeContainer>
				<PluginsRootNode id={id} onClick={onMoreClicked} ref={ref}>
					<FontAwesomeIcon icon={ICON_EXPAND_NODES}/>
					{Lang.INDICATOR.ACHIEVEMENT.PLUGINS_ROOT}
				</PluginsRootNode>
				{curve == null
					? null
					: <PluginCurve rect={curve}>
						<g>
							<path d={computeCurvePath(curve)}/>
						</g>
					</PluginCurve>}
			</PluginsRootNodeContainer>
		</PluginsRootColumn>
		<PluginsRootColumn>
			<NewPlugin parentId={id} achievement={achievement} plugins={state.data}
			           expanded={expanded}/>
			{expanded
				? <PickedPlugins parentId={id} achievement={achievement} plugins={state.data}/>
				: null}
		</PluginsRootColumn>
	</PluginsContainer>;
};
