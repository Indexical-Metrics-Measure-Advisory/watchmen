import {useCreateEventBus} from '@/widgets/events/use-create-event-bus';
import {useTupleEventBus} from '@/widgets/tuple-workbench/tuple-event-bus';
import {TupleEventTypes, TupleState} from '@/widgets/tuple-workbench/tuple-event-bus-types';
import React, {createContext, ReactNode, useContext} from 'react';
import {TagEventBus} from './tag-event-bus-types';

const Context = createContext<TagEventBus>({} as TagEventBus);
Context.displayName = 'TagEventBus';

export const TagEventBusProvider = (props: { children?: ReactNode }) => {
	const {children} = props;

	const {fire} = useTupleEventBus();
	const bus = useCreateEventBus<TagEventBus>('tag', {
		beforeFire: () => {
			fire(TupleEventTypes.CHANGE_TUPLE_STATE, TupleState.CHANGED);
		}
	});

	return <Context.Provider value={bus}>
		{children}
	</Context.Provider>;
};

export const useTagEventBus = () => useContext(Context);
