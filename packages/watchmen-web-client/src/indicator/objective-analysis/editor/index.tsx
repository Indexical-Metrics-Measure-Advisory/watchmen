import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import {Lang} from '@/widgets/langs';
import {useEffect, useState} from 'react';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';
import {EditorContainer, NoDataPicked, ObjectiveAnalysisCreateButton} from './widgets';

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
		return <EditorContainer>
			<NoDataPicked>
				<span>
					{Lang.INDICATOR.OBJECTIVE_ANALYSIS.NO_OBJECTIVE_ANALYSIS_PICKED}
					<ObjectiveAnalysisCreateButton>
						{Lang.INDICATOR.OBJECTIVE_ANALYSIS.CREATE_OBJECTIVE_ANALYSIS}
					</ObjectiveAnalysisCreateButton>
					{Lang.INDICATOR.OBJECTIVE_ANALYSIS.NO_OBJECTIVE_ANALYSIS_PICKED_2}
				</span>
			</NoDataPicked>
		</EditorContainer>;
	} else {
		return <EditorContainer>

		</EditorContainer>;
	}
};