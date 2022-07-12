import {fetchAchievement} from '@/services/data/tuples/achievement';
import {Achievement, AchievementId} from '@/services/data/tuples/achievement-types';
import {ObjectiveAnalysis, ObjectiveAnalysisPerspective} from '@/services/data/tuples/objective-analysis-types';
import {RoundDwarfButton} from '@/widgets/basic/button';
import {ICON_OBJECTIVE_ANALYSIS_PERSPECTIVE} from '@/widgets/basic/constants';
import {ButtonInk} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {useEffect, useState} from 'react';
import {AchievementEventBusProvider} from '../../../achievement/achievement-event-bus';
import {AchievementEditPageBody} from '../../../achievement/edit/body';
import {AchievementSaver} from '../../../achievement/edit/saver';
import {useObjectiveAnalysisEventBus} from '../../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../../objective-analysis-event-bus-types';
import {useDescription} from '../use-description';
import {
	PerspectiveButtons,
	PerspectiveContainer,
	PerspectiveDescriptor,
	PerspectiveDescriptorWrapper
} from '../widgets';
import {CreateOrFindAchievement} from './create-or-find-achievement';
import {RenderModeAssistant} from './render-mode-assistant';
import {RenderModeSwitcher} from './render-mode-switcher';
import {AchievementStateHolder} from './state';
import {AchievementEdit} from './widgets';

export const PerspectiveOnAchievement = (props: { analysis: ObjectiveAnalysis, perspective: ObjectiveAnalysisPerspective }) => {
	const {analysis, perspective} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire} = useObjectiveAnalysisEventBus();
	const {onDescriptionChanged, onDescriptionBlurred} = useDescription(analysis, perspective);
	const [achievement, setAchievement] = useState<Achievement | null>(null);
	useEffect(() => {
		const achievementId = perspective.relationId;
		if (achievementId != null && achievementId.length !== 0) {
			fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
				const {achievement} = await fetchAchievement(achievementId);
				return achievement;
			}, (achievement: Achievement) => {
				setAchievement(achievement);
			});
		}
	}, [fireGlobal, perspective.relationId]);
	const forceUpdate = useForceUpdate();

	const onDeleteClicked = () => {
		fireGlobal(EventTypes.SHOW_YES_NO_DIALOG,
			Lang.INDICATOR.OBJECTIVE_ANALYSIS.PERSPECTIVE_DELETE_DIALOG_LABEL,
			() => {
				fire(ObjectiveAnalysisEventTypes.DELETE_PERSPECTIVE, analysis, perspective);
				fireGlobal(EventTypes.HIDE_DIALOG);
			},
			() => fireGlobal(EventTypes.HIDE_DIALOG));
	};
	const onAchievementPicked = (achievementId: AchievementId) => {
		perspective.relationId = achievementId;
		fire(ObjectiveAnalysisEventTypes.SAVE, analysis);
		forceUpdate();
	};
	const onAchievementCleared = () => {
		delete perspective.relationId;
		fire(ObjectiveAnalysisEventTypes.SAVE, analysis);
		setAchievement(null);
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
			<CreateOrFindAchievement analysis={analysis} perspective={perspective} achievement={achievement}
			                         onPicked={onAchievementPicked} onCleared={onAchievementCleared}/>
			{achievement != null
				? <AchievementEdit>
					<RenderModeAssistant/>
					<AchievementEditPageBody achievement={achievement}/>
					<AchievementSaver achievement={achievement}/>
					<RenderModeSwitcher achievement={achievement}/>
				</AchievementEdit>
				: null}
		</PerspectiveContainer>
	</AchievementEventBusProvider>;
};