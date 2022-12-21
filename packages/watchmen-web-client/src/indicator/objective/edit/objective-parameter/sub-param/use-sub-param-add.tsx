import {ComputedObjectiveParameter, ObjectiveParameter} from '@/services/data/tuples/objective-types';
import {AlertLabel} from '@/widgets/alert/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import React from 'react';
import {canAddMoreParameter, createFactorParameter} from '../utils';

export const useSubParamAdd = (
	parent: ComputedObjectiveParameter,
	onAdded: (parameter: ObjectiveParameter) => void, maxCountAlertLabel: string
) => {
	const {fire: fireGlobal} = useEventBus();

	return () => {
		const canAdd = canAddMoreParameter(parent);
		if (!canAdd) {
			fireGlobal(EventTypes.SHOW_ALERT, <AlertLabel>{maxCountAlertLabel}</AlertLabel>);
		} else {
			const parameter = createFactorParameter();
			parent.parameters.push(parameter);
			onAdded(parameter);
		}
	};
};