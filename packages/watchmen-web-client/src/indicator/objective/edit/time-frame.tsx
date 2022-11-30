import {
	Objective,
	ObjectiveTimeFrame,
	ObjectiveTimeFrameKind,
	ObjectiveTimeFrameTill
} from '@/services/data/tuples/objective-types';
import {Calendar} from '@/widgets/basic/calendar';
import {Dropdown} from '@/widgets/basic/dropdown';
import {Input} from '@/widgets/basic/input';
import {DropdownOption} from '@/widgets/basic/types';
import {Lang} from '@/widgets/langs';
import React, {ChangeEvent} from 'react';
import {EditStep} from './edit-step';
import {ObjectiveDeclarationStep} from './steps';
import {EditObjective} from './types';
import {useSave} from './use-save';
import {ItemLabel, TimeFrameContainer} from './widgets';

const guardTimeFrame = (objective: Objective): ObjectiveTimeFrame => {
	if (objective.timeFrame == null) {
		objective.timeFrame = {
			kind: ObjectiveTimeFrameKind.MONTH,
			till: ObjectiveTimeFrameTill.NOW
		};
	}
	const timeFrame = objective.timeFrame;
	if (timeFrame.kind == null) {
		timeFrame.kind = ObjectiveTimeFrameKind.MONTH;
	}
	if (timeFrame.till == null) {
		timeFrame.till = ObjectiveTimeFrameTill.NOW;
	}

	return timeFrame;
};
const guardKind = (kind?: ObjectiveTimeFrameKind): ObjectiveTimeFrameKind => kind || ObjectiveTimeFrameKind.MONTH;

export const TimeFrame = (props: { data: EditObjective }) => {
	const {data: {objective}} = props;

	const save = useSave();

	const timeFrame = guardTimeFrame(objective);

	const onKindChanged = (option: DropdownOption) => {
		timeFrame.kind = option.value as ObjectiveTimeFrameKind;
		guardTimeFrame(objective);
		save(objective);
	};
	const onLastNChanged = (event: ChangeEvent<HTMLInputElement>) => {
		timeFrame.lastN = event.target.value;
		save(objective);
	};
	const onTillChanged = (option: DropdownOption) => {
		timeFrame.till = option.value as ObjectiveTimeFrameTill;
		save(objective);
	};
	const onSpecifiedTillChanged = (value?: string) => {
		if (value?.includes(' ')) {
			value = value?.substring(0, value?.indexOf(' '));
		}
		timeFrame.specifiedTill = value ?? '';
		save(objective);
	};

	const kindOptions = [
		{value: ObjectiveTimeFrameKind.NONE, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_NONE},
		{value: ObjectiveTimeFrameKind.YEAR, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_YEAR},
		{value: ObjectiveTimeFrameKind.HALF_YEAR, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_HALF_YEAR},
		{value: ObjectiveTimeFrameKind.QUARTER, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_QUARTER},
		{value: ObjectiveTimeFrameKind.MONTH, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_MONTH},
		{value: ObjectiveTimeFrameKind.WEEK_OF_YEAR, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_WEEK_OF_YEAR},
		{value: ObjectiveTimeFrameKind.DAY_OF_MONTH, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_DAY_OF_MONTH},
		{value: ObjectiveTimeFrameKind.DAY_OF_WEEK, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_DAY_OF_WEEK},
		{value: ObjectiveTimeFrameKind.LAST_N_YEARS, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_LAST_N_YEARS},
		{value: ObjectiveTimeFrameKind.LAST_N_MONTHS, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_LAST_N_MONTHS},
		{value: ObjectiveTimeFrameKind.LAST_N_WEEKS, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_LAST_N_WEEKS},
		{value: ObjectiveTimeFrameKind.LAST_N_DAYS, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND_LAST_N_DAYS}
	];
	const tillOptions = [
		{value: ObjectiveTimeFrameTill.NOW, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TILL_NOW},
		{
			value: ObjectiveTimeFrameTill.LAST_COMPLETE_CYCLE,
			label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TILL_LAST_COMPLETE_CYCLE
		},
		{value: ObjectiveTimeFrameTill.SPECIFIED, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TILL_SPECIFIED}
	];

	const isTimeRelated = timeFrame.kind !== ObjectiveTimeFrameKind.NONE;
	const isLastNKind = [
		ObjectiveTimeFrameKind.LAST_N_YEARS, ObjectiveTimeFrameKind.LAST_N_MONTHS,
		ObjectiveTimeFrameKind.LAST_N_WEEKS, ObjectiveTimeFrameKind.LAST_N_DAYS
	].includes(guardKind(timeFrame.kind));
	const isTillSpecified = timeFrame.till === ObjectiveTimeFrameTill.SPECIFIED;

	return <EditStep index={ObjectiveDeclarationStep.TIME_FRAME} title={Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TITLE}>
		<TimeFrameContainer timeRelated={isTimeRelated} lastN={isLastNKind} specifiedTill={isTillSpecified}>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND}</ItemLabel>
			<Dropdown value={timeFrame.kind || ObjectiveTimeFrameTill.NOW} options={kindOptions}
			          onChange={onKindChanged}/>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_N_IS}</ItemLabel>
			<Input value={timeFrame.lastN || ''} onChange={onLastNChanged}/>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TILL}</ItemLabel>
			<Dropdown value={timeFrame.till || ObjectiveTimeFrameTill.NOW} options={tillOptions}
			          onChange={onTillChanged}/>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TILL_SPECIFIED_AT}</ItemLabel>
			<Calendar value={timeFrame.specifiedTill} onChange={onSpecifiedTillChanged} showTime={false}/>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TILL_SPECIFIED_AT_DESC}</ItemLabel>
		</TimeFrameContainer>
	</EditStep>;
};