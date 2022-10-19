import {Router} from '@/routes/types';
import {deleteObjectiveAnalysis} from '@/services/data/tuples/objective-analysis';
import {ObjectiveAnalysis, ObjectiveAnalysisPerspectiveType} from '@/services/data/tuples/objective-analysis-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {
	ICON_BACK,
	ICON_INDICATOR_ACHIEVEMENT,
	ICON_INDICATOR_INSPECTION,
	ICON_LOCK,
	ICON_THROW_AWAY,
	ICON_UNLOCK
} from '@/widgets/basic/constants';
import {PageHeaderButton, PageHeaderButtons, PageHeaderButtonSeparator} from '@/widgets/basic/page-header-buttons';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React from 'react';
import {useHistory} from 'react-router-dom';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';
import {useViewModeSwitch} from '../use-view-mode-switch';
import {NameEditor} from './name-editor';
import {PageHeaderHolder} from './widgets';

export const Header = (props: { analysis: ObjectiveAnalysis, startOnView: boolean }) => {
	const {analysis, startOnView} = props;

	const history = useHistory();
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
	const onBackClicked = () => {
		history.replace(Router.INDICATOR_OBJECTIVE_ANALYSIS);
	};

	return <PageHeaderHolder>
		<NameEditor analysis={analysis}/>
		<PageHeaderButtons>
			{viewMode
				? <PageHeaderButton tooltip={Lang.INDICATOR.OBJECTIVE_ANALYSIS.SWITCH_TO_EDIT_MODE}
				                    onClick={onSwitchToEditModeClicked}>
					<FontAwesomeIcon icon={ICON_LOCK}/>
				</PageHeaderButton>
				: <>
					<PageHeaderButton tooltip={Lang.INDICATOR.OBJECTIVE_ANALYSIS.SWITCH_TO_VIEW_MODE}
					                  onClick={onSwitchToViewModeClicked}>
						<FontAwesomeIcon icon={ICON_UNLOCK}/>
					</PageHeaderButton>
					<PageHeaderButtonSeparator/>
					<PageHeaderButton tooltip={Lang.INDICATOR.OBJECTIVE_ANALYSIS.ADD_INSPECTION}
					                  onClick={onAddInspectionClicked}>
						<FontAwesomeIcon icon={ICON_INDICATOR_INSPECTION}/>
					</PageHeaderButton>
					<PageHeaderButton tooltip={Lang.INDICATOR.OBJECTIVE_ANALYSIS.ADD_ACHIEVEMENT}
					                  onClick={onAddAchievementClicked}>
						<FontAwesomeIcon icon={ICON_INDICATOR_ACHIEVEMENT}/>
					</PageHeaderButton>
				</>}
			<PageHeaderButtonSeparator/>
			<PageHeaderButton tooltip={Lang.INDICATOR.OBJECTIVE_ANALYSIS.DELETE_ME} onClick={onDeleteClicked}>
				<FontAwesomeIcon icon={ICON_THROW_AWAY}/>
			</PageHeaderButton>
			<PageHeaderButtonSeparator/>
			<PageHeaderButton tooltip={Lang.INDICATOR.OBJECTIVE_ANALYSIS.BACK_TO_LIST} onClick={onBackClicked}>
				<FontAwesomeIcon icon={ICON_BACK} transform={{rotate: 180}}/>
			</PageHeaderButton>
		</PageHeaderButtons>
	</PageHeaderHolder>;
};