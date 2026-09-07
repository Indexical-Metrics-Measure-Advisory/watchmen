import {useCreateEventBus} from '@/widgets/events/use-create-event-bus';
import React, {createContext, ReactNode, useContext} from 'react';
import {TopicArchiveEventBus} from './topic-archive-event-bus-types';

const Context = createContext<TopicArchiveEventBus>({} as TopicArchiveEventBus);
Context.displayName = 'TopicArchiveEventBus';

export const TopicArchiveEventBusProvider = (props: { children?: ReactNode }) => {
	const {children} = props;

	const bus = useCreateEventBus<TopicArchiveEventBus>('topic archive');

	return <Context.Provider value={bus}>
		{children}
	</Context.Provider>;
};

export const useTopicArchiveEventBus = () => useContext(Context);
