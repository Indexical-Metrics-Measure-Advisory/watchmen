import {Achievement} from '@/services/data/tuples/achievement-types';
import {ObjectiveAnalysis, ObjectiveAnalysisPerspective} from '@/services/data/tuples/objective-analysis-types';
import {PluginId} from '@/services/data/tuples/plugin-types';
import {QueryPlugin} from '@/services/data/tuples/query-plugin-types';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {useEffect, useState} from 'react';
import {useObjectiveAnalysisEventBus} from '../../../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../../../objective-analysis-event-bus-types';
import {useViewModeSwitch} from '../../use-view-mode-switch';
import {AchievementDropdown, AchievementLabel} from '../widgets';
import {PluginPickContainer, PluginsContainer} from './widgets';

interface LoadedPlugins {
	loaded: boolean;
	data: Array<QueryPlugin>;
}

export const AchievementPlugins = (props: {
	analysis: ObjectiveAnalysis;
	perspective: ObjectiveAnalysisPerspective;
	achievement: Achievement | null;
	startOnView: boolean;
}) => {
	const {achievement, startOnView} = props;

	const {fire} = useObjectiveAnalysisEventBus();
	const [plugins, setPlugins] = useState<LoadedPlugins>({loaded: false, data: []});
	const onViewMode = useViewModeSwitch(startOnView);
	useEffect(() => {
		if (!plugins.loaded) {
			fire(ObjectiveAnalysisEventTypes.ASK_PLUGINS, (plugins: Array<QueryPlugin>) => {
				setPlugins({loaded: true, data: plugins});
			});
		}
	}, [fire, plugins.loaded]);
	const forceUpdate = useForceUpdate();

	if (achievement == null || (onViewMode && (achievement.pluginIds || []).length === 0)) {
		return null;
	}

	const onPluginIdChange = (pluginId: PluginId, index: number) => (option: DropdownOption) => {
		const newPluginId = option.value as PluginId;
		if (newPluginId === pluginId) {
			return;
		}
		achievement.pluginIds![index] = newPluginId;
		forceUpdate();
	};
	const onNewPluginAdd = (option: DropdownOption) => {
		const pluginId = option.value as PluginId;
		if (achievement.pluginIds == null) {
			achievement.pluginIds = [];
		}
		achievement.pluginIds.push(pluginId);
		forceUpdate();
	};

	const pluginIds = achievement.pluginIds || [];
	// eslint-disable-next-line
	const pluginOptions = plugins.data.map(plugin => {
		return {value: plugin.pluginId, label: `${plugin.pluginCode}${plugin.name ? ` - ${plugin.name}` : ''}`};
	});

	return <PluginsContainer>
		<AchievementLabel>{Lang.INDICATOR.ACHIEVEMENT.PLUGINS_LABEL}</AchievementLabel>
		<PluginPickContainer>
			{pluginIds.map((pluginId, index) => {
				return <AchievementDropdown value={pluginId} options={pluginOptions}
				                            onChange={onPluginIdChange(pluginId, index)}
				                            key={`${pluginId}-${index}`}/>;
			})}
			<AchievementDropdown value={''} options={pluginOptions} onChange={onNewPluginAdd}
			                     please={Lang.INDICATOR.ACHIEVEMENT.ADD_PLUGIN}/>
		</PluginPickContainer>
	</PluginsContainer>;
};
