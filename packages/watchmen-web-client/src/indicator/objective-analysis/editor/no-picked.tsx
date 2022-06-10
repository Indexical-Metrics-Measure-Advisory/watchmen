import {saveObjectiveAnalysis} from '@/services/data/tuples/objective-analysis';
import {ObjectiveAnalysis} from '@/services/data/tuples/objective-analysis-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {getCurrentTime} from '@/services/data/utils';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';
import {EditorContainer, NoDataPicked, ObjectiveAnalysisCreateButton} from './widgets';

export const NoPicked = () => {
	const {fire: fireGlobal} = useEventBus();
	const {fire} = useObjectiveAnalysisEventBus();

	const onCreateClicked = () => {
		const objectiveAnalysis: ObjectiveAnalysis = {
			analysisId: generateUuid(),
			title: '',
			lastVisitTime: getCurrentTime(),
			createdAt: getCurrentTime(),
			lastModifiedAt: getCurrentTime()
		};
		fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
			return await saveObjectiveAnalysis(objectiveAnalysis);
		}, (objectiveAnalysis: ObjectiveAnalysis) => {
			fire(ObjectiveAnalysisEventTypes.CREATED, objectiveAnalysis);
		});
	};

	return <EditorContainer>
		<NoDataPicked>
				<span>
					{Lang.INDICATOR.OBJECTIVE_ANALYSIS.NO_OBJECTIVE_ANALYSIS_PICKED}
					<ObjectiveAnalysisCreateButton onClick={onCreateClicked}>
						{Lang.INDICATOR.OBJECTIVE_ANALYSIS.CREATE_OBJECTIVE_ANALYSIS}
					</ObjectiveAnalysisCreateButton>
					{Lang.INDICATOR.OBJECTIVE_ANALYSIS.NO_OBJECTIVE_ANALYSIS_PICKED_2}
				</span>
		</NoDataPicked>
	</EditorContainer>;
};