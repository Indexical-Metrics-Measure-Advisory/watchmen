import {fetchObjective} from '@/services/data/tuples/objective';
import {Objective, ObjectiveId} from '@/services/data/tuples/objective-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import React, {Fragment, useEffect, useState} from 'react';
import {useObjectivesEventBus} from './objectives-event-bus';
import {ObjectivesData, ObjectivesEventTypes} from './objectives-event-bus-types';
import {createObjective} from './utils';

export const ObjectiveState = () => {
	const {fire: fireGlobal} = useEventBus();
	const {on, off} = useObjectivesEventBus();
	const [data, setData] = useState<ObjectivesData>({});

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
		const onPickObjective = async (objectiveId: ObjectiveId, onData: (data: ObjectivesData) => void) => {
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
		const onAskObjective = (onData: (data?: ObjectivesData) => void) => {
			onData(data);
		};
		on(ObjectivesEventTypes.ASK_OBJECTIVE, onAskObjective);
		return () => {
			off(ObjectivesEventTypes.ASK_OBJECTIVE, onAskObjective);
		};
	}, [on, off, data]);

	return <Fragment/>;
};
