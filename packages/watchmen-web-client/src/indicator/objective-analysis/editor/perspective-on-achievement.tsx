import {AchievementId} from '@/services/data/tuples/achievement-types';
import {ObjectiveAnalysis, ObjectiveAnalysisPerspective} from '@/services/data/tuples/objective-analysis-types';
import {RoundDwarfButton} from '@/widgets/basic/button';
import {ICON_OBJECTIVE_ANALYSIS_PERSPECTIVE} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {AchievementEventBusProvider} from '../../achievement/achievement-event-bus';
import {AchievementStateHolder} from '../../achievement/state';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';
import {CreateOrFindAchievement} from './create-or-find-achievement';
import {useDescription} from './use-description';
import {PerspectiveButtons, PerspectiveContainer, PerspectiveDescriptor, PerspectiveDescriptorWrapper} from './widgets';

export const PerspectiveOnAchievement = (props: { analysis: ObjectiveAnalysis, perspective: ObjectiveAnalysisPerspective }) => {
	const {analysis, perspective} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire} = useObjectiveAnalysisEventBus();
	const {onDescriptionChanged, onDescriptionBlurred} = useDescription(perspective);

	const onDeleteClicked = () => {
		fireGlobal(EventTypes.SHOW_YES_NO_DIALOG,
			Lang.INDICATOR.OBJECTIVE_ANALYSIS.PERSPECTIVE_DELETE_DIALOG_LABEL,
			() => {
				fire(ObjectiveAnalysisEventTypes.DELETE_PERSPECTIVE, analysis, perspective);
				fireGlobal(EventTypes.HIDE_DIALOG);
			},
			() => fireGlobal(EventTypes.HIDE_DIALOG));
	};
	const onAchievementPicked = (achievement: AchievementId) => {

	};
	const onAchievementCleared = () => {

	};

	return <AchievementEventBusProvider>
		<AchievementStateHolder/>
		<PerspectiveContainer>
			<PerspectiveDescriptorWrapper>
				<FontAwesomeIcon icon={ICON_OBJECTIVE_ANALYSIS_PERSPECTIVE}/>
				<PerspectiveDescriptor value={perspective.description ?? ''}
				                       onChange={onDescriptionChanged} onBlur={onDescriptionBlurred}
				                       placeholder={Lang.PLAIN.OBJECTIVE_ANALYSIS_PERSPECTIVE_DESCRIPTION_PLACEHOLDER}/>
				<PerspectiveButtons>
					<RoundDwarfButton ink={ButtonInk.DANGER} onClick={onDeleteClicked}>
						{Lang.ACTIONS.DELETE}
					</RoundDwarfButton>
				</PerspectiveButtons>
			</PerspectiveDescriptorWrapper>
			<CreateOrFindAchievement analysis={analysis} perspective={perspective}
			                         onPicked={onAchievementPicked} onCleared={onAchievementCleared}/>
		</PerspectiveContainer>
	</AchievementEventBusProvider>;
};