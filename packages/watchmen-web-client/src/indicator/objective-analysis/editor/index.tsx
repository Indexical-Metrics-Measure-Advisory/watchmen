import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import {useEffect, useState} from 'react';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';
import {NoPicked} from './no-picked';
import {EditorContainer} from './widgets';

export const ObjectiveAnalysisEditor = () => {
	const {on, off} = useObjectiveAnalysisEventBus();
	const [objectiveAnalysis, setObjectiveAnalysis] = useState<ObjectiveAnalysis | null>(null);
	useEffect(() => {
		const onStartEdit = (objectiveAnalysis: ObjectiveAnalysis) => {
			setObjectiveAnalysis(objectiveAnalysis);
		};
		on(ObjectiveAnalysisEventTypes.START_EDIT, onStartEdit);
		return () => {
			off(ObjectiveAnalysisEventTypes.START_EDIT, onStartEdit);
		};
	}, [on, off]);

	if (objectiveAnalysis == null) {
		return <NoPicked/>;
	} else {
		return <EditorContainer>

		</EditorContainer>;
	}
};