import {useCreateEventBus} from '@/widgets/events/use-create-event-bus';
import React, {createContext, ReactNode, useContext} from 'react';
import {ObjectiveAnalysisListEventBus} from './objective-analysis-list-event-bus-types';

const Context = createContext<ObjectiveAnalysisListEventBus>({} as ObjectiveAnalysisListEventBus);
Context.displayName = 'ObjectiveAnalysisListEventBus';

export const ObjectiveAnalysisListEventBusProvider = (props: { children?: ReactNode }) => {
	const {children} = props;

	const bus = useCreateEventBus<ObjectiveAnalysisListEventBus>('objective-analysis-list');

	return <Context.Provider value={bus}>
		{children}
	</Context.Provider>;
};

export const useObjectiveAnalysisListEventBus = () => useContext(Context);
