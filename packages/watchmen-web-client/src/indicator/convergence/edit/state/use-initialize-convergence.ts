import {Convergence} from '@/services/data/tuples/convergence-types';
import {useEffect, useState} from 'react';
import {useConvergencesEventBus} from '../../convergences-event-bus';
import {ConvergencesEventTypes} from '../../convergences-event-bus-types';
import {createConvergence} from '../../utils';

export const useInitializeConvergence = (): Convergence | null => {
	const {fire} = useConvergencesEventBus();
	const [convergence, setConvergence] = useState<Convergence | null>(null);
	useEffect(() => {
		fire(ConvergencesEventTypes.ASK_CONVERGENCE, (convergence?: Convergence) => {
			if (convergence == null) {
				setConvergence(createConvergence());
			} else {
				setConvergence(convergence);
			}
		});
	}, [fire]);

	return convergence;
};
