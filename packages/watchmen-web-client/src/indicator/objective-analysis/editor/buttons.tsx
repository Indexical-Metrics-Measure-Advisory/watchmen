import {useObjectiveAnalysisEventBus} from '@/indicator/objective-analysis/objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '@/indicator/objective-analysis/objective-analysis-event-bus-types';
import {deleteObjectiveAnalysis} from '@/services/data/tuples/objective-analysis';
import {ObjectiveAnalysis, ObjectiveAnalysisPerspectiveType} from '@/services/data/tuples/objective-analysis-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {RoundDwarfButton} from '@/widgets/basic/button';
import {ButtonInk} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {useState} from 'react';
import {EditorHeaderButtons} from './widgets';

export const HeaderButtons = (props: { analysis: ObjectiveAnalysis }) => {
	const {analysis} = props;

	const {fire: fireGlobal} = useEventBus();
	const {fire} = useObjectiveAnalysisEventBus();
	const [viewMode, setViewMode] = useState(false);
	const forceUpdate = useForceUpdate();

	const onAddInspectionClicked = () => {
		analysis.perspectives = analysis.perspectives ?? [];
		analysis.perspectives.push({
			perspectiveId: generateUuid(),
			type: ObjectiveAnalysisPerspectiveType.INSPECTION
		});
		fire(ObjectiveAnalysisEventTypes.SAVE, analysis);
		forceUpdate();
	};
	const onAddAchievementClicked = () => {
		analysis.perspectives = analysis.perspectives ?? [];
		analysis.perspectives.push({
			perspectiveId: generateUuid(),
			type: ObjectiveAnalysisPerspectiveType.ACHIEVEMENT
		});
		fire(ObjectiveAnalysisEventTypes.SAVE, analysis);
		forceUpdate();
	};
	const onSwitchToEditModeClicked = () => {
		setViewMode(false);
		fire(ObjectiveAnalysisEventTypes.SWITCH_TO_EDIT);
	};
	const onSwitchToViewModeClicked = () => {
		setViewMode(true);
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
		<RoundDwarfButton ink={ButtonInk.PRIMARY} onClick={onAddInspectionClicked}>
			{Lang.INDICATOR.OBJECTIVE_ANALYSIS.ADD_INSPECTION}
		</RoundDwarfButton>
		<RoundDwarfButton ink={ButtonInk.PRIMARY} onClick={onAddAchievementClicked}>
			{Lang.INDICATOR.OBJECTIVE_ANALYSIS.ADD_ACHIEVEMENT}
		</RoundDwarfButton>
		{viewMode
			? <RoundDwarfButton ink={ButtonInk.PRIMARY} onClick={onSwitchToEditModeClicked}>
				{Lang.INDICATOR.OBJECTIVE_ANALYSIS.SWITCH_TO_EDIT_MODE}
			</RoundDwarfButton>
			: <RoundDwarfButton ink={ButtonInk.PRIMARY} onClick={onSwitchToViewModeClicked}>
				{Lang.INDICATOR.OBJECTIVE_ANALYSIS.SWITCH_TO_VIEW_MODE}
			</RoundDwarfButton>}
		<RoundDwarfButton ink={ButtonInk.DANGER} onClick={onDeleteClicked}>
			{Lang.ACTIONS.DELETE}
		</RoundDwarfButton>
	</EditorHeaderButtons>;
};