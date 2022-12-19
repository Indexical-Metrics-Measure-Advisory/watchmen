import {useParameterEventBus} from '@/indicator/objective/edit/parameter/parameter-event-bus';
import {ParameterEventTypes} from '@/indicator/objective/edit/parameter/parameter-event-bus-types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useEffect} from 'react';

export const useParameterFromChanged = () => {
	const {on, off} = useParameterEventBus();
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		on(ParameterEventTypes.FROM_CHANGED, forceUpdate);
		return () => {
			off(ParameterEventTypes.FROM_CHANGED, forceUpdate);
		};
	}, [on, off, forceUpdate]);
};