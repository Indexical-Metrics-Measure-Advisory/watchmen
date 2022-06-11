import {fetchIndicator, listAllIndicators} from '@/services/data/tuples/indicator';
import {Indicator, IndicatorId} from '@/services/data/tuples/indicator-types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Fragment, useEffect, useState} from 'react';
import {IndicatorForInspection} from '../../inspection/inspection-event-bus-types';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';

interface IndicatorState {
	loaded: boolean;
	data: Array<Indicator>;
}

type AskingRequest = (indicators: Array<Indicator>) => void;
type AskingRequestQueue = Array<AskingRequest>;
type LoadedIndicatorsForInspections = Record<IndicatorId, IndicatorForInspection>;

export const IndicatorsData = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off} = useObjectiveAnalysisEventBus();
	const [loading, setLoading] = useState(false);
	const [queue] = useState<AskingRequestQueue>([]);
	const [state, setState] = useState<IndicatorState>({loaded: false, data: []});
	const [indicatorsForInspections, setIndicatorsForInspections] = useState<LoadedIndicatorsForInspections>({});

	useEffect(() => {
		// noinspection DuplicatedCode
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
		on(ObjectiveAnalysisEventTypes.ASK_INDICATORS, onAskIndicators);
		return () => {
			off(ObjectiveAnalysisEventTypes.ASK_INDICATORS, onAskIndicators);
		};
	}, [fireGlobal, on, off, loading, queue, state.loaded, state.data]);
	useEffect(() => {
		// noinspection DuplicatedCode
		const onAskIndicator = (indicatorId: IndicatorId, onData: (indicator: IndicatorForInspection) => void) => {
			if (indicatorsForInspections[indicatorId] != null) {
				onData(indicatorsForInspections[indicatorId]);
			} else {
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => {
						const {indicator, topic, subject, enums} = await fetchIndicator(indicatorId);
						return {indicator, topic, subject, enums};
					},
					({indicator, topic, subject, enums}: IndicatorForInspection) => {
						setIndicatorsForInspections(ifi => {
							return {...ifi, [indicatorId]: {indicator, topic, subject, enums: enums ?? []}};
						});
						onData({indicator, topic, subject, enums: enums ?? []});
					});
			}
		};
		on(ObjectiveAnalysisEventTypes.ASK_INDICATOR, onAskIndicator);
		return () => {
			off(ObjectiveAnalysisEventTypes.ASK_INDICATOR, onAskIndicator);
		};
	}, [fireGlobal, on, off, indicatorsForInspections]);

	return <Fragment/>;
};