import {Router} from '@/routes/types';
import {deleteObjectiveAnalysis} from '@/services/data/tuples/objective-analysis';
import {ObjectiveAnalysis, ObjectiveAnalysisPerspectiveType} from '@/services/data/tuples/objective-analysis-types';
import {generateUuid} from '@/services/data/tuples/utils';
import {AlertLabel} from '@/widgets/alert/widgets';
import {Button} from '@/widgets/basic/button';
import {
	ICON_BACK,
	ICON_INDICATOR_ACHIEVEMENT,
	ICON_INDICATOR_INSPECTION,
	ICON_LOCK,
	ICON_SUBSCRIBE,
	ICON_THROW_AWAY,
	ICON_UNLOCK
} from '@/widgets/basic/constants';
import {Dropdown} from '@/widgets/basic/dropdown';
import {Input} from '@/widgets/basic/input';
import {PageHeaderButton, PageHeaderButtons, PageHeaderButtonSeparator} from '@/widgets/basic/page-header-buttons';
import {ButtonInk, DropdownOption} from '@/widgets/basic/types';
import {DialogFooter, DialogTitle} from '@/widgets/dialog/widgets';
import {useEventBus} from '@/widgets/events/event-bus';
import {EventTypes} from '@/widgets/events/types';
import {Lang} from '@/widgets/langs';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {ChangeEvent, useState} from 'react';
import {useHistory} from 'react-router-dom';
import {useObjectiveAnalysisListEventBus} from '../../objective-analysis-list-event-bus';
import {ObjectiveAnalysisListEventTypes} from '../../objective-analysis-list-event-bus-types';
import {useObjectiveAnalysisEventBus} from '../objective-analysis-event-bus';
import {ObjectiveAnalysisEventTypes} from '../objective-analysis-event-bus-types';
import {useViewModeSwitch} from '../use-view-mode-switch';
import {NameEditor} from './name-editor';
import {PageHeaderHolder, SubscribeDialogBody, SubscribeLeadLabel} from './widgets';

enum SubscribeType {
	MAIL = 'mail',
	SLACK = 'slack'
}

interface SubscribeModel {
	type: SubscribeType;
	param: string;
}

export const SubscribeDialog = (props: { analysis: ObjectiveAnalysis }) => {
	// noinspection JSUnusedLocalSymbols
	const {analysis} = props;

	const {fire} = useEventBus();
	const [model, setModel] = useState<SubscribeModel>({type: SubscribeType.MAIL, param: ''});

	const onTypeChanged = (option: DropdownOption) => {
		const type = option.value as SubscribeType;
		if (type === model.type) {
			return;
		}
		setModel({type, param: ''});
	};
	const onParamChanged = (event: ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setModel(model => ({type: model.type, param: value}));
	};
	const onConfirmClicked = () => {
		fire(EventTypes.SHOW_ALERT, <AlertLabel>Subscribed!</AlertLabel>);
		fire(EventTypes.HIDE_DIALOG);
	};
	const onCloseClicked = () => {
		fire(EventTypes.HIDE_DIALOG);
	};

	const typeOptions = [
		{value: SubscribeType.MAIL, label: 'Email'},
		{value: SubscribeType.SLACK, label: 'Slack'}
	];
	const label = model.type === SubscribeType.MAIL ? 'Mail Address' : 'Slack Channel';
	const placeholder = model.type === SubscribeType.MAIL ? 'Multiple addresses joined by ;' : '';

	return <>
		<DialogTitle>Subscribe Analysis</DialogTitle>
		<SubscribeDialogBody>
			<SubscribeLeadLabel>Subscribe On:</SubscribeLeadLabel>
			<Dropdown value={model.type} options={typeOptions} onChange={onTypeChanged}/>
			<SubscribeLeadLabel>{label}</SubscribeLeadLabel>
			<Input value={model.param} placeholder={placeholder} onChange={onParamChanged}/>
		</SubscribeDialogBody>
		<DialogFooter>
			<Button ink={ButtonInk.PRIMARY} onClick={onConfirmClicked}>{Lang.ACTIONS.CONFIRM}</Button>
			<Button ink={ButtonInk.WAIVE} onClick={onCloseClicked}>{Lang.ACTIONS.CANCEL}</Button>
		</DialogFooter>
	</>;
};

export const Header = (props: { analysis: ObjectiveAnalysis, startOnView: boolean }) => {
	const {analysis, startOnView} = props;

	const history = useHistory();
	const {fire: fireGlobal} = useEventBus();
	const {fire: fireList} = useObjectiveAnalysisListEventBus();
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
	const onSubscribeClicked = () => {
		fireGlobal(EventTypes.SHOW_DIALOG, <SubscribeDialog analysis={analysis}/>,
			{
				marginTop: '10vh',
				marginLeft: '20%',
				width: '40%'
			});
	};
	const onDeleteClicked = () => {
		fireGlobal(EventTypes.SHOW_YES_NO_DIALOG,
			Lang.INDICATOR.OBJECTIVE_ANALYSIS.DELETE_DIALOG_LABEL,
			() => {
				fireGlobal(EventTypes.INVOKE_REMOTE_REQUEST, async () => {
					await deleteObjectiveAnalysis(analysis);
				}, () => {
					fireList(ObjectiveAnalysisListEventTypes.OBJECTIVE_ANALYSIS_DELETED, analysis);
					fireGlobal(EventTypes.HIDE_DIALOG);
					history.replace(Router.INDICATOR_OBJECTIVE_ANALYSIS);
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
			<PageHeaderButton tooltip={Lang.INDICATOR.OBJECTIVE_ANALYSIS.SUBSCRIBE} onClick={onSubscribeClicked}>
				<FontAwesomeIcon icon={ICON_SUBSCRIBE}/>
			</PageHeaderButton>
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