// noinspection DuplicatedCode

import {useCreateEventBus} from '@/widgets/events/use-create-event-bus';
import React, {createContext, ReactNode, useContext} from 'react';
import {ParameterEventBus, ParameterEventTypes} from './parameter-event-bus-types';

const Context = createContext<ParameterEventBus>({} as ParameterEventBus);
Context.displayName = 'ObjectiveParameterEventBus';

export const ParameterEventBusProvider = (props: { children?: ReactNode }) => {
	const {children} = props;

	const bus = useCreateEventBus<ParameterEventBus>('parameter', {
		afterFire: (type, emitter) => emitter.emit(ParameterEventTypes.PARAM_CHANGED)
	});

	return <Context.Provider value={bus}>
		{children}
	</Context.Provider>;
};

export const useParameterEventBus = () => useContext(Context);
