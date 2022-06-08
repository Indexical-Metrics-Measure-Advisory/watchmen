import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import {Fragment, useEffect} from 'react';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';

export const DataHolder = () => {
	const {on, off} = useObjectiveAnalysisEventBus();
	useEffect(() => {
		const onAskList = (onData: (data: Array<ObjectiveAnalysis>) => void) => {
			onData([]);
		};
		on(ObjectiveAnalysisEventTypes.ASK_LIST, onAskList);
		return () => {
			off(ObjectiveAnalysisEventTypes.ASK_LIST, onAskList);
		};
	}, [on, off]);

	return <Fragment/>;
};