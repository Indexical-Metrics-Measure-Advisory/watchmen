import {Indicator} from '@/services/data/tuples/indicator-types';
import {Objective} from '@/services/data/tuples/objective-types';
import {useEffect} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';

export const useAskIndicators = (options: {
	objective?: Objective | null;
	shouldAsk: () => boolean;
	// keep it unchanged
	onLoad: (all: Array<Indicator>) => void;
}) => {
	const {objective, shouldAsk, onLoad} = options;

	const {fire} = useObjectivesEventBus();

	useEffect(() => {
		if (objective == null || !shouldAsk()) {
			return;
		}
		fire(ObjectivesEventTypes.ASK_ALL_INDICATORS, (all: Array<Indicator>) => {
			onLoad(all);
		});
	}, [fire, objective, shouldAsk, onLoad]);
};