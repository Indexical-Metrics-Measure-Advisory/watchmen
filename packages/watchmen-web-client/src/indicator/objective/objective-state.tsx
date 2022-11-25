import {fetchObjective, saveObjective} from '@/services/data/tuples/objective';
import {Objective, ObjectiveId} from '@/services/data/tuples/objective-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {useThrottler} from '@/widgets/throttler';
import React, {Fragment, useEffect, useState} from 'react';
import {useObjectivesEventBus} from './objectives-event-bus';
import {ObjectiveData, ObjectivesEventTypes} from './objectives-event-bus-types';
import {createObjective} from './utils';

export const ObjectiveState = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off, fire} = useObjectivesEventBus();
	const [data, setData] = useState<ObjectiveData>({});

	useEffect(() => {
		const onCreateObjective = (onCreated: (objective: Objective) => void) => {
			const objective = createObjective();
			setData({objective});
			onCreated(objective);
		};
		on(ObjectivesEventTypes.CREATE_OBJECTIVE, onCreateObjective);
		return () => {
			off(ObjectivesEventTypes.CREATE_OBJECTIVE, onCreateObjective);
		};
	}, [on, off]);
	useEffect(() => {
		const onPickObjective = async (objectiveId: ObjectiveId, onData: (data: ObjectiveData) => void) => {
			try {
				const data = await fetchObjective(objectiveId);
				setData(data);
				onData(data);
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
		const onAskObjective = (onData: (data?: ObjectiveData) => void) => {
			onData(data);
		};
		on(ObjectivesEventTypes.ASK_OBJECTIVE, onAskObjective);
		return () => {
			off(ObjectivesEventTypes.ASK_OBJECTIVE, onAskObjective);
		};
	}, [on, off, data]);
	const saveQueue = useThrottler();
	useEffect(() => {
		const onSaveObjective = (objective: Objective, onSaved: (objective: Objective, saved: boolean) => void) => {
			saveQueue.replace(() => {
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST,
					async () => await saveObjective(objective),
					() => {
						fire(ObjectivesEventTypes.OBJECTIVE_SAVED, objective);
						onSaved(objective, true);
					},
					() => onSaved(objective, false));
			}, 500);
		};
		on(ObjectivesEventTypes.SAVE_OBJECTIVE, onSaveObjective);
		return () => {
			off(ObjectivesEventTypes.SAVE_OBJECTIVE, onSaveObjective);
		};
	}, [on, off, fire, fireGlobal, saveQueue]);

	return <Fragment/>;
};
