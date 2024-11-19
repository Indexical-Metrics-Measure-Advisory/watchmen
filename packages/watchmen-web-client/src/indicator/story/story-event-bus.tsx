import {useCreateEventBus} from '@/widgets/events/use-create-event-bus';
import React, {createContext, ReactNode, useContext} from 'react';
import {StoryEventBus} from './story-event-bus-types';

const Context = createContext<StoryEventBus>({} as StoryEventBus);
Context.displayName = 'StoryEventBus';

export const StoryEventBusProvider = (props: { children?: ReactNode }) => {
	const {children} = props;

	const bus = useCreateEventBus<StoryEventBus>('story');

	return <Context.Provider value={bus}>
		{children}
	</Context.Provider>;
};

export const useStoryEventBus = () => useContext(Context);
