import {QueryPlugin} from '@/services/data/tuples/query-plugin-types';
import {Fragment, useEffect} from 'react';
import {useAchievementEventBus} from '../../../../achievement/achievement-event-bus';
import {AchievementEventTypes} from '../../../../achievement/achievement-event-bus-types';
import {useObjectiveAnalysisEventBus} from '../../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../../objective-analysis-event-bus-types';

export const PluginsDataProxy = () => {
	const {on, off} = useAchievementEventBus();
	const {fire} = useObjectiveAnalysisEventBus();
	useEffect(() => {
		const onAskPlugins = (onData: (plugins: Array<QueryPlugin>) => void) => {
			fire(ObjectiveAnalysisEventTypes.ASK_PLUGINS, onData);
		};
		on(AchievementEventTypes.ASK_PLUGINS, onAskPlugins);
		return () => {
			off(AchievementEventTypes.ASK_PLUGINS, onAskPlugins);
		};
	}, [on, off, fire]);

	return <Fragment/>;
};