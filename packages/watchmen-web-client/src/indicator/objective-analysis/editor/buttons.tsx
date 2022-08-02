import {deleteObjectiveAnalysis} from '@/services/data/tuples/objective-analysis';
import {ObjectiveAnalysis, ObjectiveAnalysisPerspectiveType} from '@/services/data/tuples/objective-analysis-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {RoundDwarfButton} from '@/widgets/basic/button';
import {ButtonInk} from '@/widgets/basic/types';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';
import {useViewModeSwitch} from './use-view-mode-switch';
import {EditorHeaderButtons} from './widgets';

export const HeaderButtons = (props: {
	analysis: ObjectiveAnalysis;
	startOnView: boolean;
}) => {
	const {analysis, startOnView} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire} = useObjectiveAnalysisEventBus();
	const viewMode = useViewModeSwitch(startOnView);

	const onAddInspectionClicked = () => {
		analysis.perspectives = analysis.perspectives ?? [];
		const perspective = {
			perspectiveId: generateUuid(),
			type: ObjectiveAnalysisPerspectiveType.INSPECTION
		};
		analysis.perspectives.push(perspective);
		fire(ObjectiveAnalysisEventTypes.SAVE, analysis);
		fire(ObjectiveAnalysisEventTypes.PERSPECTIVE_ADDED, analysis, perspective);
	};
	const onAddAchievementClicked = () => {
		analysis.perspectives = analysis.perspectives ?? [];
		const perspective = {
			perspectiveId: generateUuid(),
			type: ObjectiveAnalysisPerspectiveType.ACHIEVEMENT
		};
		analysis.perspectives.push(perspective);
		fire(ObjectiveAnalysisEventTypes.SAVE, analysis);
		fire(ObjectiveAnalysisEventTypes.PERSPECTIVE_ADDED, analysis, perspective);
	};
	const onSwitchToEditModeClicked = () => {
		fire(ObjectiveAnalysisEventTypes.SWITCH_TO_EDIT);
	};
	const onSwitchToViewModeClicked = () => {
		fire(ObjectiveAnalysisEventTypes.SWITCH_TO_VIEW);
	};
	const onDeleteClicked = () => {
		fireGlobal(EventTypes.SHOW_YES_NO_DIALOG,
			Lang.INDICATOR.OBJECTIVE_ANALYSIS.DELETE_DIALOG_LABEL,
			() => {
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
					await deleteObjectiveAnalysis(analysis);
				}, () => {
					fire(ObjectiveAnalysisEventTypes.DELETED, analysis);
					fireGlobal(EventTypes.HIDE_DIALOG);
				});
			},
			() => fireGlobal(EventTypes.HIDE_DIALOG));
	};

	return <EditorHeaderButtons>
		{viewMode
			? <RoundDwarfButton ink={ButtonInk.PRIMARY} onClick={onSwitchToEditModeClicked}>
				{Lang.INDICATOR.OBJECTIVE_ANALYSIS.SWITCH_TO_EDIT_MODE}
			</RoundDwarfButton>
			: <>
				<RoundDwarfButton ink={ButtonInk.PRIMARY} onClick={onAddInspectionClicked}>
					{Lang.INDICATOR.OBJECTIVE_ANALYSIS.ADD_INSPECTION}
				</RoundDwarfButton>
				<RoundDwarfButton ink={ButtonInk.PRIMARY} onClick={onAddAchievementClicked}>
					{Lang.INDICATOR.OBJECTIVE_ANALYSIS.ADD_ACHIEVEMENT}
				</RoundDwarfButton>
				<RoundDwarfButton ink={ButtonInk.PRIMARY} onClick={onSwitchToViewModeClicked}>
					{Lang.INDICATOR.OBJECTIVE_ANALYSIS.SWITCH_TO_VIEW_MODE}
				</RoundDwarfButton>
			</>}
		<RoundDwarfButton ink={ButtonInk.DANGER} onClick={onDeleteClicked}>
			{Lang.ACTIONS.DELETE}
		</RoundDwarfButton>
	</EditorHeaderButtons>;
};