import {ObjectiveParameter, ObjectiveParameterType} from '@/services/data/tuples/objective-types';
import {MouseEvent, useState} from 'react';
import {defendParameterAndRemoveUnnecessary} from '../../../param-utils';
import {useParameterEventBus} from '../parameter-event-bus';
import {ParameterEventTypes} from '../parameter-event-bus-types';

export const useParamFrom = (parameter: ObjectiveParameter) => {
	const {fire} = useParameterEventBus();
	const [editing, setEditing] = useState(false);

	const onStartEditing = () => setEditing(true);
	const onBlur = () => setEditing(false);
	const onFromChanged = (from: ObjectiveParameterType) => (event: MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		if (from === parameter.kind) {
			// do nothing, discard or start editing
			setEditing(!editing);
		} else {
			parameter.kind = from;
			defendParameterAndRemoveUnnecessary(parameter);
			setEditing(false);
			fire(ParameterEventTypes.FROM_CHANGED, parameter);
		}
	};
	const onIconClicked = (event: MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setEditing(!editing);
	};

	return {onFromChanged, onIconClicked, onStartEditing, onBlur, editing};
};