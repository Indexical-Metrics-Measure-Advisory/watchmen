// noinspection DuplicatedCode

import {useForceUpdate} from '@/widgets/basic/utils';
import {useEffect} from 'react';
import {useParameterEventBus} from './parameter-event-bus';
import {ParameterEventTypes} from './parameter-event-bus-types';

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