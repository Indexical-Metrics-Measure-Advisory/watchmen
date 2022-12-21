import {Indicator} from '@/services/data/tuples/indicator-types';
import {Objective} from '@/services/data/tuples/objective-types';
import {useEffect} from 'react';
import {useObjectivesEventBus} from '../../objectives-event-bus';
import {ObjectivesEventTypes} from '../../objectives-event-bus-types';

export const useAskIndicators = (options: {
	objective?: Objective | null;
	shouldStartAsk: () => boolean;
	// keep it unchanged
	onLoad: (all: Array<Indicator>) => void;
}) => {
	const {objective, shouldStartAsk, onLoad} = options;

	const {fire} = useObjectivesEventBus();

	useEffect(() => {
		if (objective == null || !shouldStartAsk()) {
			return;
		}
		fire(ObjectivesEventTypes.ASK_ALL_INDICATORS, (all: Array<Indicator>) => {
			onLoad(all);
		});
	}, [fire, objective, shouldStartAsk, onLoad]);
};