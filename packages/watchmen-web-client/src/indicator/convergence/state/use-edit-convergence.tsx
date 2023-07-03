import {useConvergencesEventBus} from '@/indicator/convergence/convergences-event-bus';
import {ConvergencesEventTypes} from '@/indicator/convergence/convergences-event-bus-types';
import {fetchConvergence} from '@/services/data/tuples/convergence';
import {Convergence, ConvergenceId} from '@/services/data/tuples/convergence-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import React, {useEffect, useState} from 'react';
import {createConvergence} from '../utils';

export const useEditConvergence = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off} = useConvergencesEventBus();
	const [editOne, setEditOne] = useState<Convergence | null>(null);

	useEffect(() => {
		const onCreateConvergence = (onCreated: (convergence: Convergence) => void) => {
			const convergence = createConvergence();
			setEditOne(convergence);
			onCreated(convergence);
		};
		on(ConvergencesEventTypes.CREATE_CONVERGENCE, onCreateConvergence);
		return () => {
			off(ConvergencesEventTypes.CREATE_CONVERGENCE, onCreateConvergence);
		};
	}, [on, off]);
	useEffect(() => {
		const onPickConvergence = async (convergenceId: ConvergenceId, onData: (convergence: Convergence) => void) => {
			try {
				const convergence = await fetchConvergence(convergenceId);
				setEditOne(convergence);
				onData(convergence);
			} catch {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
					{Lang.INDICATOR.CONVERGENCE.FAILED_TO_LOAD_CONVERGENCE}
				</AlertLabel>);
			}
		};
		on(ConvergencesEventTypes.PICK_CONVERGENCE, onPickConvergence);
		return () => {
			off(ConvergencesEventTypes.PICK_CONVERGENCE, onPickConvergence);
		};
	}, [on, off, fireGlobal]);
	useEffect(() => {
		const onAskConvergence = (onData: (convergence?: Convergence) => void) => {
			onData(editOne == null ? (void 0) : editOne);
		};
		on(ConvergencesEventTypes.ASK_CONVERGENCE, onAskConvergence);
		return () => {
			off(ConvergencesEventTypes.ASK_CONVERGENCE, onAskConvergence);
		};
	}, [on, off, editOne]);
};