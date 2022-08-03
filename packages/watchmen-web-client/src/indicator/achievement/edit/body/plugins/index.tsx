import {Achievement} from '@/services/data/tuples/achievement-types';
import {QueryPlugin} from '@/services/data/tuples/query-plugin-types';
import {Lang} from '@/widgets/langs';
import {useEffect, useState} from 'react';
import {v4} from 'uuid';
import {useAchievementEventBus} from '../../../achievement-event-bus';
import {AchievementEventTypes} from '../../../achievement-event-bus-types';
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

	const {fire: fireAchievement} = useAchievementEventBus();
	const [state, setState] = useState<PluginsState>({loaded: false, data: []});
	const {ref, curve} = useCurve(parentId);
	const [id] = useState(v4());
	useEffect(() => {
		if (!state.loaded) {
			fireAchievement(AchievementEventTypes.ASK_PLUGINS, (plugins: Array<QueryPlugin>) => {
				setState({loaded: true, data: plugins});
			});
		}
	}, [fireAchievement, achievement, state.loaded]);

	if (!state.loaded || state.data.length === 0) {
		return null;
	}

	return <PluginsContainer>
		<PluginsRootColumn>
			<PluginsRootNodeContainer>
				<PluginsRootNode id={id} ref={ref}>
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
			<PickedPlugins parentId={id} achievement={achievement} plugins={state.data}/>
			<NewPlugin parentId={id} achievement={achievement} plugins={state.data}/>
		</PluginsRootColumn>
	</PluginsContainer>;
};
