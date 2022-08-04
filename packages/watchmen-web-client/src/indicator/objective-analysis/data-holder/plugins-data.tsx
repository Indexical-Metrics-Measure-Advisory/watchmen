import {listAchievementPlugins} from '@/services/data/tuples/plugin';
import {QueryPlugin} from '@/services/data/tuples/query-plugin-types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Fragment, useEffect, useState} from 'react';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';

interface LoadedPlugins {
	loaded: boolean;
	data: Array<QueryPlugin>;
	loader?: Promise<Array<QueryPlugin>>;
}

export const PluginsData = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off} = useObjectiveAnalysisEventBus();
	const [state, setState] = useState<LoadedPlugins>({loaded: false, data: []});
	useEffect(() => {
		const onAskPlugins = (onData: (plugins: Array<QueryPlugin>) => void) => {
			if (state.loaded) {
				onData(state.data);
			} else if (state.loader) {
				state.loader.then(inspections => onData(inspections));
			} else {
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => await listAchievementPlugins(),
					(plugins: Array<QueryPlugin>) => {
						const sorted = plugins.sort((i1, i2) => {
							return (i1.name || '').localeCompare(i2.name || '', void 0, {
								sensitivity: 'base',
								caseFirst: 'upper'
							});
						});
						setState({loaded: true, data: sorted});
						onData(sorted);
					});
			}
		};

		on(ObjectiveAnalysisEventTypes.ASK_PLUGINS, onAskPlugins);
		return () => {
			off(ObjectiveAnalysisEventTypes.ASK_PLUGINS, onAskPlugins);
		};
	}, [fireGlobal, on, off, state.loaded, state.data, state.loader]);

	return <Fragment/>;
};