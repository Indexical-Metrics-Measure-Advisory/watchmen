import {useCreateEventBus} from '@/widgets/events/use-create-event-bus';
import React, {createContext, ReactNode, useContext} from 'react';
import {ObjectiveAnalysisEventBus} from './objective-analysis-event-bus-types';

const Context = createContext<ObjectiveAnalysisEventBus>({} as ObjectiveAnalysisEventBus);
Context.displayName = 'ObjectiveAnalysisEventBus';

export const ObjectiveAnalysisEventBusProvider = (props: { children?: ReactNode }) => {
	const {children} = props;

	const bus = useCreateEventBus<ObjectiveAnalysisEventBus>('objective-analysis');

	return <Context.Provider value={bus}>
		{children}
	</Context.Provider>;
};

export const useObjectiveAnalysisEventBus = () => useContext(Context);
