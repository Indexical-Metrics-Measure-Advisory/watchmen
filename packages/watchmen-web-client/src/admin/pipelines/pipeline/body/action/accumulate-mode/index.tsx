import {
	PipelineStageUnitAction,
	WriteTopicActionType
} from '@/services/data/tuples/pipeline-stage-unit-action/pipeline-stage-unit-action-types';
import {
	AccumulateMode,
	WriteTopicAction
} from '@/services/data/tuples/pipeline-stage-unit-action/write-topic-actions-types';
import {ICON_COLLAPSE_CONTENT, ICON_EDIT} from '@/widgets/basic/constants';
import {useForceUpdate} from '@/widgets/basic/utils';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import React, {MouseEvent, useEffect, useState} from 'react';
import {useActionEventBus} from '../action-event-bus';
import {ActionEventTypes} from '../action-event-bus-types';
import {ActionLeadLabelThin} from '../widgets';
import {AccumulateModeButton, AccumulateModeContainer, AccumulateModeOption} from './widgets';

const OptionsLabel: Record<AccumulateMode, string> = {
	[AccumulateMode.STANDARD]: 'Standard',
	[AccumulateMode.REVERSE]: 'Reverse',
	[AccumulateMode.CUMULATE]: 'Force Cumulate'
};

const AvailableOptions: Record<WriteTopicActionType, Array<AccumulateMode>> = {
	[WriteTopicActionType.INSERT_ROW]: [AccumulateMode.STANDARD],
	[WriteTopicActionType.INSERT_OR_MERGE_ROW]: [AccumulateMode.STANDARD, AccumulateMode.CUMULATE],
	[WriteTopicActionType.MERGE_ROW]: [AccumulateMode.STANDARD, AccumulateMode.REVERSE, AccumulateMode.CUMULATE],
	[WriteTopicActionType.WRITE_FACTOR]: [AccumulateMode.STANDARD, AccumulateMode.REVERSE, AccumulateMode.CUMULATE]
};

const findReasonableMode = (action: WriteTopicAction): AccumulateMode => {
	if (action.type === WriteTopicActionType.INSERT_ROW) {
		if (action.accumulateMode === AccumulateMode.REVERSE) {
			// only standard is allowed on insert row
			return AccumulateMode.STANDARD;
		}
	} else if (action.type === WriteTopicActionType.INSERT_OR_MERGE_ROW) {
		if (action.accumulateMode === AccumulateMode.REVERSE) {
			// reverse is not allowed on insert/merge row
			return AccumulateMode.STANDARD;
		}
	}
	return action.accumulateMode ?? AccumulateMode.STANDARD;
};

export const AccumulateModeRow = (props: { action: WriteTopicAction }) => {
	const {action} = props;

	const {on, off, fire} = useActionEventBus();
	const [expanded, setExpanded] = useState(false);
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onActionTypeChanged = (anAction: PipelineStageUnitAction) => {
			if (action !== anAction) {
				return;
			}
			action.accumulateMode = findReasonableMode(action);
			forceUpdate();
		};
		on(ActionEventTypes.ACTION_TYPE_CHANGED, onActionTypeChanged);
		return () => {
			off(ActionEventTypes.ACTION_TYPE_CHANGED, onActionTypeChanged);
		};
	}, [on, off, forceUpdate, action]);

	const accumulateMode = findReasonableMode(action);
	const onExpandedClicked = () => setExpanded(true);
	const onBlur = () => setExpanded(false);
	const onModeClicked = (newMode: AccumulateMode) => (event: MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		if (newMode === accumulateMode) {
			if (!expanded) {
				setExpanded(true);
			}
		} else {
			action.accumulateMode = newMode;
			fire(ActionEventTypes.ACTION_CONTENT_CHANGED, action);
			setExpanded(false);
		}
	};
	const onIconClicked = (event: MouseEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setExpanded(!expanded);
	};
	const candidates = AvailableOptions[action.type].filter(candidate => candidate !== accumulateMode);

	return <>
		<ActionLeadLabelThin>Accumulate Mode:</ActionLeadLabelThin>
		<AccumulateModeContainer tabIndex={0} onClick={onExpandedClicked} onBlur={onBlur}>
			<AccumulateModeOption active={true} expanded={expanded}
			                      onClick={onModeClicked(accumulateMode)}>
				{OptionsLabel[accumulateMode]}
			</AccumulateModeOption>
			{candidates.map(candidate => {
				return <AccumulateModeOption active={false} expanded={expanded}
				                             onClick={onModeClicked(candidate)}
				                             key={candidate}>
					{OptionsLabel[candidate]}
				</AccumulateModeOption>;
			})}
			{candidates.length !== 0
				? <AccumulateModeButton data-expanded={expanded} onClick={onIconClicked}>
					<FontAwesomeIcon icon={expanded ? ICON_COLLAPSE_CONTENT : ICON_EDIT}/>
				</AccumulateModeButton>
				: null}
		</AccumulateModeContainer>
	</>;
};