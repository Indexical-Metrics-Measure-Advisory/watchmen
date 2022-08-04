import {listAchievementPlugins} from '@/services/data/tuples/plugin';
import {QueryPlugin} from '@/services/data/tuples/query-plugin-types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Fragment, useEffect, useState} from 'react';
import {useAchievementEventBus} from '../achievement-event-bus';
import {AchievementEventTypes} from '../achievement-event-bus-types';

interface PluginsState {
	loaded: boolean;
	data: Array<QueryPlugin>;
}

type AskingRequest = (plugins: Array<QueryPlugin>) => void;
type AskingRequestQueue = Array<AskingRequest>;

export const PluginsData = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off} = useAchievementEventBus();
	const [loading, setLoading] = useState(false);
	const [queue] = useState<AskingRequestQueue>([]);
	const [state, setState] = useState<PluginsState>({loaded: false, data: []});
	useEffect(() => {
		const onAskIndicators = (onData: (plugins: Array<QueryPlugin>) => void) => {
			if (state.loaded) {
				onData(state.data);
			} else if (loading) {
				queue.push(onData);
			} else {
				setLoading(true);

				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => await listAchievementPlugins(),
					(plugins: Array<QueryPlugin>) => {
						setState({loaded: true, data: plugins});
						setLoading(false);
						onData(plugins);
					},
					() => {
						onData([]);
						setLoading(false);
					}
				);
			}
		};
		if (!loading && queue.length !== 0) {
			queue.forEach(onData => onData(state.data));
			// clear queue
			queue.length = 0;
		}
		on(AchievementEventTypes.ASK_PLUGINS, onAskIndicators);
		return () => {
			off(AchievementEventTypes.ASK_PLUGINS, onAskIndicators);
		};
	}, [fireGlobal, on, off, loading, queue, state.loaded, state.data]);

	return <Fragment/>;
};