import {listAllIndicators} from '@/services/data/tuples/indicator';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Fragment, useEffect, useState} from 'react';
import {useAchievementEventBus} from '../achievement-event-bus';
import {AchievementEventTypes} from '../achievement-event-bus-types';

interface IndicatorState {
	loaded: boolean;
	data: Array<Indicator>;
}

type AskingRequest = (indicators: Array<Indicator>) => void;
type AskingRequestQueue = Array<AskingRequest>;

export const IndicatorsData = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off} = useAchievementEventBus();
	const [loading, setLoading] = useState(false);
	const [queue] = useState<AskingRequestQueue>([]);
	const [state, setState] = useState<IndicatorState>({loaded: false, data: []});
	useEffect(() => {
		const onAskIndicators = (onData: (indicators: Array<Indicator>) => void) => {
			if (state.loaded) {
				onData(state.data);
			} else if (loading) {
				queue.push(onData);
			} else {
				setLoading(true);

				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => await listAllIndicators(),
					(indicators: Array<Indicator>) => {
						setState({loaded: true, data: indicators});
						setLoading(false);
						onData(indicators);
					}, () => {
						onData([]);
						setLoading(false);
					});
			}
		};
		if (!loading && queue.length !== 0) {
			queue.forEach(onData => onData(state.data));
			// clear queue
			queue.length = 0;
		}
		on(AchievementEventTypes.ASK_INDICATORS, onAskIndicators);
		return () => {
			off(AchievementEventTypes.ASK_INDICATORS, onAskIndicators);
		};
	}, [fireGlobal, on, off, loading, queue, state.loaded, state.data]);

	return <Fragment/>;
};