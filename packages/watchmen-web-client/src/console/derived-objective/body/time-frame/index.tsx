import {DerivedObjective} from '@/services/data/tuples/derived-objective-types';
import {ObjectiveTimeFrameKind, ObjectiveTimeFrameTill} from '@/services/data/tuples/objective-types';
import {noop} from '@/services/utils';
import {Calendar} from '@/widgets/basic/calendar';
import {Dropdown} from '@/widgets/basic/dropdown';
import {DropdownOption} from '@/widgets/basic/types';
import {useForceUpdate} from '@/widgets/basic/utils';
import {Lang} from '@/widgets/langs';
import {buildLastNOptions, buildTillOptions, findTimeFrameKindLabel} from '@/widgets/objective/options-utils';
import {
	computeChainFrame,
	computeFrame,
	computePreviousFrame,
	guardKind,
	guardTimeFrame,
	lastN,
	renderTimeFrame
} from '@/widgets/objective/time-frame-utils';
import React, {useEffect, useState} from 'react';
import {useObjectiveEventBus} from '../../objective-event-bus';
import {ObjectiveEventTypes} from '../../objective-event-bus-types';
import {
	CalculatedTimeFrameRow,
	TimeFrameContainer,
	TimeFrameLabel,
	TimeFrameTitle,
	TimeFrameValue,
	TimeFrameVariablesRow
} from './widgets';

export const TimeFrame = (props: { derivedObjective: DerivedObjective; }) => {
	const {derivedObjective} = props;

	const {on, off, fire} = useObjectiveEventBus();
	const [visible, setVisible] = useState(false);
	const forceUpdate = useForceUpdate();
	useEffect(() => {
		const onSwitchVariablesVisible = (switchTo: boolean) => {
			setVisible(switchTo);
		};
		on(ObjectiveEventTypes.SWITCH_VARIABLES_VISIBLE, onSwitchVariablesVisible);
		return () => {
			off(ObjectiveEventTypes.SWITCH_VARIABLES_VISIBLE, onSwitchVariablesVisible);
		};
	}, [on, off]);

	const {definition: objective} = derivedObjective;
	const timeFrame = guardTimeFrame(objective);

	const isTimeRelated = timeFrame.kind !== ObjectiveTimeFrameKind.NONE;

	if (!isTimeRelated) {
		return <TimeFrameContainer data-visible={visible}>
			<TimeFrameTitle>{Lang.CONSOLE.DERIVED_OBJECTIVE.NOT_TIME_RELATED}</TimeFrameTitle>
		</TimeFrameContainer>;
	}

	const onLastNChanged = (option: DropdownOption) => {
		timeFrame.lastN = option.value as string;
		fire(ObjectiveEventTypes.TIME_FRAME_CHANGED);
		fire(ObjectiveEventTypes.SAVE, noop);
		forceUpdate();
	};
	const onTillChanged = (option: DropdownOption) => {
		timeFrame.till = option.value as ObjectiveTimeFrameTill;
		guardTimeFrame(objective);
		fire(ObjectiveEventTypes.TIME_FRAME_CHANGED);
		fire(ObjectiveEventTypes.SAVE, noop);
		forceUpdate();
	};
	const onSpecifiedTillChanged = (value?: string) => {
		if (value?.includes(' ')) {
			value = value?.substring(0, value?.indexOf(' '));
		}
		timeFrame.specifiedTill = value ?? '';
		fire(ObjectiveEventTypes.TIME_FRAME_CHANGED);
		fire(ObjectiveEventTypes.SAVE, noop);
		forceUpdate();
	};

	const isLastNKind = lastN(guardKind(timeFrame.kind));
	const isTillSpecified = timeFrame.till === ObjectiveTimeFrameTill.SPECIFIED;

	const tillOptions = buildTillOptions();
	const lastNOptions = buildLastNOptions(timeFrame);
	const currentFrame = computeFrame(timeFrame);
	const previousFrame = computePreviousFrame(timeFrame, currentFrame);
	const chainFrame = computeChainFrame(timeFrame, currentFrame);

	return <TimeFrameContainer data-visible={visible} data-hide-on-share={true}>
		<TimeFrameTitle>{Lang.CONSOLE.DERIVED_OBJECTIVE.TIME_FRAME_TITLE}</TimeFrameTitle>
		<TimeFrameVariablesRow>
			<TimeFrameLabel>{findTimeFrameKindLabel(timeFrame)}</TimeFrameLabel>
			{isLastNKind
				? <>
					<TimeFrameLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_N_IS}</TimeFrameLabel>
					<Dropdown value={timeFrame.lastN || ''} options={lastNOptions} onChange={onLastNChanged}/>
				</>
				: null}
			<TimeFrameLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TILL}</TimeFrameLabel>
			<Dropdown value={timeFrame.till || ObjectiveTimeFrameTill.NOW} options={tillOptions}
			          onChange={onTillChanged}/>
			{isTillSpecified
				? <>
					<TimeFrameLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TILL_SPECIFIED_AT}</TimeFrameLabel>
					<Calendar value={timeFrame.specifiedTill} onChange={onSpecifiedTillChanged} showTime={false}/>
					<TimeFrameLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TILL_SPECIFIED_AT_DESC}</TimeFrameLabel>
				</>
				: null}
		</TimeFrameVariablesRow>
		<CalculatedTimeFrameRow>
			<TimeFrameLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_CALCULATED}</TimeFrameLabel>
			<TimeFrameValue>{renderTimeFrame(currentFrame)}</TimeFrameValue>
			<TimeFrameLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_PREVIOUS_CYCLE}</TimeFrameLabel>
			<TimeFrameValue>{renderTimeFrame(previousFrame)}</TimeFrameValue>
			<TimeFrameLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_CHAIN_CYCLE}</TimeFrameLabel>
			<TimeFrameValue>{renderTimeFrame(chainFrame)}</TimeFrameValue>
		</CalculatedTimeFrameRow>
	</TimeFrameContainer>;
};
