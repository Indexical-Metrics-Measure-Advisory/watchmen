import {fetchObjective} from '@/services/data/tuples/objective';
import {Objective, ObjectiveId} from '@/services/data/tuples/objective-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import React, {useEffect, useState} from 'react';
import {useObjectivesEventBus} from '../objectives-event-bus';
import {ObjectivesEventTypes} from '../objectives-event-bus-types';
import {createObjective} from '../utils';

export const useEditObjective = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off} = useObjectivesEventBus();
	const [editOne, setEditOne] = useState<Objective | null>(null);

	useEffect(() => {
		const onCreateObjective = (onCreated: (objective: Objective) => void) => {
			const objective = createObjective();
			setEditOne(objective);
			onCreated(objective);
		};
		on(ObjectivesEventTypes.CREATE_OBJECTIVE, onCreateObjective);
		return () => {
			off(ObjectivesEventTypes.CREATE_OBJECTIVE, onCreateObjective);
		};
	}, [on, off]);
	useEffect(() => {
		const onPickObjective = async (objectiveId: ObjectiveId, onData: (objective: Objective) => void) => {
			try {
				const objective = await fetchObjective(objectiveId);
				setEditOne(objective);
				onData(objective);
			} catch {
				fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>
					{Lang.INDICATOR.OBJECTIVE.FAILED_TO_LOAD_OBJECTIVE}
				</AlertLabel>);
			}
		};
		on(ObjectivesEventTypes.PICK_OBJECTIVE, onPickObjective);
		return () => {
			off(ObjectivesEventTypes.PICK_OBJECTIVE, onPickObjective);
		};
	}, [on, off, fireGlobal]);
	useEffect(() => {
		const onAskObjective = (onData: (objective?: Objective) => void) => {
			onData(editOne == null ? (void 0) : editOne);
		};
		on(ObjectivesEventTypes.ASK_OBJECTIVE, onAskObjective);
		return () => {
			off(ObjectivesEventTypes.ASK_OBJECTIVE, onAskObjective);
		};
	}, [on, off, editOne]);
};