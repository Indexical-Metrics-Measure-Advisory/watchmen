import {listAllIndicators} from '@/services/data/tuples/indicator';
import {Indicator, IndicatorId} from '@/services/data/tuples/indicator-types';
import {useEffect, useState} from 'react';
import {useObjectivesEventBus} from '../objectives-event-bus';
import {ObjectivesEventTypes} from '../objectives-event-bus-types';

interface AllIndicatorsState {
	loaded: boolean;
	data: Record<IndicatorId, Indicator>;
}

export const useAllIndicators = () => {
	const {on, off} = useObjectivesEventBus();
	const [indicators, setIndicators] = useState<AllIndicatorsState>({loaded: false, data: {}});
	useEffect(() => {
		const onAskIndicators = async (onData: (data: Array<Indicator>) => void) => {
			if (!indicators.loaded) {
				const data = await listAllIndicators();
				setIndicators({
					loaded: true, data: data.reduce((map, indicator) => {
						map[`${indicator.indicatorId}`] = indicator;
						return map;
					}, {} as Record<IndicatorId, Indicator>)
				});
				onData(data);
			} else {
				onData(Object.values(indicators.data));
			}
		};
		const onAskIndicator = (indicatorId: IndicatorId, onData: (indicator?: Indicator) => void) => {
			const found = indicators.data[`${indicatorId}`];
			onData(found ?? (void 0));
		};
		on(ObjectivesEventTypes.ASK_ALL_INDICATORS, onAskIndicators);
		on(ObjectivesEventTypes.ASK_INDICATOR, onAskIndicator);
		return () => {
			off(ObjectivesEventTypes.ASK_ALL_INDICATORS, onAskIndicators);
			off(ObjectivesEventTypes.ASK_INDICATOR, onAskIndicator);
		};
	}, [on, off, indicators]);
};