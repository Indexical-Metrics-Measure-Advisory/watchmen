import {listAllIndicators} from '@/services/data/tuples/indicator';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {useEffect, useState} from 'react';
import {useObjectivesEventBus} from '../objectives-event-bus';
import {ObjectivesEventTypes} from '../objectives-event-bus-types';

interface AllIndicatorsState {
	loaded: boolean;
	data: Array<Indicator>;
}

export const useAllIndicators = () => {
	const {on, off} = useObjectivesEventBus();
	const [indicators, setIndicators] = useState<AllIndicatorsState>({loaded: false, data: []});
	useEffect(() => {
		const onAskIndicators = async (onData: (data: Array<Indicator>) => void) => {
			if (!indicators.loaded) {
				const data = await listAllIndicators();
				setIndicators({loaded: true, data});
				onData(data);
			} else {
				onData(indicators.data);
			}
		};
		on(ObjectivesEventTypes.ASK_ALL_INDICATORS, onAskIndicators);
		return () => {
			off(ObjectivesEventTypes.ASK_ALL_INDICATORS, onAskIndicators);
		};
	}, [on, off, indicators]);
};