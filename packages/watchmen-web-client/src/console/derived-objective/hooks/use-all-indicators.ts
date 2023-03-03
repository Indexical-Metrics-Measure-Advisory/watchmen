import {fetchIndicator} from '@/services/data/tuples/indicator';
import {IndicatorId} from '@/services/data/tuples/indicator-types';
import {useEffect, useState} from 'react';
import {useObjectiveEventBus} from '../objective-event-bus';
import {ObjectiveEventTypes} from '../objective-event-bus-types';
import {IndicatorData} from '../types';

interface IndicatorsState {
	data: Record<IndicatorId, IndicatorData>;
	requesters: Record<IndicatorId, Promise<IndicatorData | undefined>>;
}

export const useAllIndicators = () => {
	const {on, off} = useObjectiveEventBus();
	const [indicators] = useState<IndicatorsState>({data: {}, requesters: {}});
	useEffect(() => {
		const onAskIndicator = async (indicatorId: IndicatorId, onData: (data?: IndicatorData) => void) => {
			const found = indicators.data[`${indicatorId}`];
			if (found == null) {
				const requester = indicators.requesters[`${indicatorId}`];
				if (requester == null) {
					indicators.requesters[`${indicatorId}`] = new Promise<IndicatorData | undefined>(async resolve => {
						try {
							const {indicator, topic, subject} = await fetchIndicator(indicatorId);
							const data = {indicator, topic, subject};
							indicators.data[`${indicatorId}`] = data;
							onData(data);
							resolve(data);
						} catch {
							indicators.data[`${indicatorId}`] = {};
							onData(void 0);
							resolve(void 0);
						}
						delete indicators.requesters[`${indicatorId}`];
					});
				} else {
					onData(await requester);
				}
			} else {
				// data loaded already, but indicator might be not found
				onData(found.indicator == null ? (void 0) : found);
			}
		};
		on(ObjectiveEventTypes.ASK_INDICATOR_DATA, onAskIndicator);
		return () => {
			off(ObjectiveEventTypes.ASK_INDICATOR_DATA, onAskIndicator);
		};
	}, [on, off, indicators]);
};
