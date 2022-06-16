import {useCreateEventBus} from '@/widgets/events/use-create-event-bus';
import React, {createContext, ReactNode, useContext} from 'react';
import {TopicSnapshotEventBus} from './topic-snapshot-event-bus-types';

const Context = createContext<TopicSnapshotEventBus>({} as TopicSnapshotEventBus);
Context.displayName = 'TopicSnapshotEventBus';

export const TopicSnapshotEventBusProvider = (props: { children?: ReactNode }) => {
	const {children} = props;

	const bus = useCreateEventBus<TopicSnapshotEventBus>('topic snapshot');

	return <Context.Provider value={bus}>
		{children}
	</Context.Provider>;
};

export const useTopicSnapshotEventBus = () => useContext(Context);
