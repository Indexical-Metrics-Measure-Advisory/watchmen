import {ComputedObjectiveParameter, ObjectiveParameter} from '@/services/data/tuples/objective-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import React from 'react';
import {canDeleteAnyParameter} from '../utils';

export const useSubParamDelete = (
	parentParameter: ComputedObjectiveParameter,
	parameterToBeDelete: ObjectiveParameter,
	onDeleted: () => void,
	canNotDeleteAlertLabel: string
) => {
	const {fire: fireGlobal} = useEventBus();

	return () => {
		const canDelete = canDeleteAnyParameter(parentParameter);
		if (!canDelete) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>{canNotDeleteAlertLabel}</AlertLabel>);
		} else {
			const index = parentParameter.parameters.findIndex(child => child === parameterToBeDelete);
			if (index !== -1) {
				parentParameter.parameters.splice(index, 1);
				onDeleted();
			}
		}
	};
};