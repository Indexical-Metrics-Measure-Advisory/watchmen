import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import {useEffect, useState} from 'react';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';
import {NoPicked} from './no-picked';
import {Picked} from './picked';

export const ObjectiveAnalysisEditor = () => {
	const {on, off} = useObjectiveAnalysisEventBus();
	const [analysis, setAnalysis] = useState<ObjectiveAnalysis | null>(null);
	useEffect(() => {
		const onStartEdit = (analysis: ObjectiveAnalysis) => {
			setAnalysis(analysis);
		};
		const onDeleted = (anAnalysis: ObjectiveAnalysis) => {
			if (anAnalysis !== analysis) {
				return;
			}
			setAnalysis(null);
		};
		on(ObjectiveAnalysisEventTypes.START_EDIT, onStartEdit);
		on(ObjectiveAnalysisEventTypes.DELETED, onDeleted);
		return () => {
			off(ObjectiveAnalysisEventTypes.START_EDIT, onStartEdit);
			off(ObjectiveAnalysisEventTypes.DELETED, onDeleted);
		};
	}, [on, off, analysis]);

	if (analysis == null) {
		return <NoPicked/>;
	} else {
		return <Picked analysis={analysis}/>;
	}
};