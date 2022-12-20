import {ComputedObjectiveParameter, ObjectiveParameter} from '@/services/data/tuples/objective-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import React from 'react';
import {canDeleteAnyParameter} from '../utils';

export const useSubParamDelete = (
	parent: ComputedObjectiveParameter, parameterToBeDelete: ObjectiveParameter,
	onDeleted: () => void, canNotDeleteAlertLabel: string
) => {
	const {fire: fireGlobal} = useEventBus();

	return () => {
		const canDelete = canDeleteAnyParameter(parent);
		if (!canDelete) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>{canNotDeleteAlertLabel}</AlertLabel>);
		} else {
			const index = parent.parameters.findIndex(child => child === parameterToBeDelete);
			if (index !== -1) {
				parent.parameters.splice(index, 1);
				onDeleted();
			}
		}
	};
};