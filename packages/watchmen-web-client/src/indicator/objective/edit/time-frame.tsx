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
import dayjs, {Dayjs} from 'dayjs';
import React, {ChangeEvent} from 'react';
import {EditStep} from './edit-step';
import {ObjectiveDeclarationStep} from './steps';
import {EditObjective} from './types';
import {useSave} from './use-save';
import {ItemLabel, ItemValue, TimeFrameContainer} from './widgets';

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

type Frame = { from: Dayjs, to: Dayjs };
const computeLastDay = (timeFrame: ObjectiveTimeFrame): Dayjs => {
	if (timeFrame.till === ObjectiveTimeFrameTill.LAST_COMPLETE_CYCLE) {
		const now = dayjs();
		switch (timeFrame.kind) {
			case ObjectiveTimeFrameKind.YEAR:
			case ObjectiveTimeFrameKind.LAST_N_YEARS:
				// 12/31, last year
				return now.month(11).date(31).subtract(1, 'year');
			case ObjectiveTimeFrameKind.HALF_YEAR: {
				const month = now.month();
				if (month < 6) {
					// 12/31, last year
					return now.month(11).date(31).subtract(1, 'year');
				} else {
					// 6/30, this year
					return now.month(5).date(30);
				}
			}
			case ObjectiveTimeFrameKind.QUARTER: {
				const month = now.month();
				if (month < 3) {
					// 12/31, last year
					return now.month(11).date(31).subtract(1, 'year');
				} else if (month < 6) {
					// 3/31, this year
					return now.month(2).date(31);
				} else if (month < 9) {
					// 6/30, this year
					return now.month(5).date(30);
				} else {
					// 9/30, this year
					return now.month(8).date(30);
				}
			}
			case ObjectiveTimeFrameKind.MONTH:
			case ObjectiveTimeFrameKind.LAST_N_MONTHS:
				// last day of last month
				return now.date(1).subtract(1, 'day');
			case ObjectiveTimeFrameKind.WEEK_OF_YEAR:
			case ObjectiveTimeFrameKind.LAST_N_WEEKS:
				// last saturday
				return now.day(6).subtract(1, 'week');
			case ObjectiveTimeFrameKind.DAY_OF_MONTH:
			case ObjectiveTimeFrameKind.DAY_OF_WEEK:
			case ObjectiveTimeFrameKind.LAST_N_DAYS:
				return now.subtract(1, 'day');
			case ObjectiveTimeFrameKind.NONE:
			default:
				return now;
		}
	} else if (timeFrame.till === ObjectiveTimeFrameTill.SPECIFIED) {
		const value = timeFrame.specifiedTill;
		const lastDay = value == null ? dayjs() : dayjs(value);
		return lastDay.isValid() ? lastDay : dayjs();
	} else {
		const now = dayjs();
		switch (timeFrame.kind) {
			case ObjectiveTimeFrameKind.YEAR:
			case ObjectiveTimeFrameKind.LAST_N_YEARS:
				// 12/31, this year
				return now.month(11).date(31);
			case ObjectiveTimeFrameKind.HALF_YEAR: {
				const month = now.month();
				if (month < 6) {
					// 6/30, this year
					return now.month(5).date(30);
				} else {
					// 12/31, this year
					return now.month(11).date(31);
				}
			}
			case ObjectiveTimeFrameKind.QUARTER: {
				const month = now.month();
				if (month < 3) {
					// 3/31, this year
					return now.month(2).date(31);
				} else if (month < 6) {
					// 6/30, this year
					return now.month(5).date(30);
				} else if (month < 9) {
					// 9/30, this year
					return now.month(8).date(30);
				} else {
					// 12/31, this year
					return now.month(11).date(31);
				}
			}
			case ObjectiveTimeFrameKind.MONTH:
			case ObjectiveTimeFrameKind.LAST_N_MONTHS:
				// last day of this month
				return now.date(1).add(1, 'month').subtract(1, 'day');
			case ObjectiveTimeFrameKind.WEEK_OF_YEAR:
			case ObjectiveTimeFrameKind.LAST_N_WEEKS:
				// this saturday
				return now.day(6);
			case ObjectiveTimeFrameKind.DAY_OF_MONTH:
			case ObjectiveTimeFrameKind.DAY_OF_WEEK:
			case ObjectiveTimeFrameKind.LAST_N_DAYS:
			case ObjectiveTimeFrameKind.NONE:
			default:
				return now;
		}
	}
};
const computeLastN = (timeFrame: ObjectiveTimeFrame): number => {
	const lastN = Number(timeFrame.lastN);
	return isNaN(lastN) ? 0 : Math.floor(Math.abs(lastN));
};
const computeFrame = (timeFrame: ObjectiveTimeFrame): Frame | undefined => {
	const lastDay = computeLastDay(timeFrame);
	switch (timeFrame.kind) {
		case ObjectiveTimeFrameKind.NONE:
			return (void 0);
		case ObjectiveTimeFrameKind.YEAR:
			return {from: lastDay.subtract(1, 'year').add(1, 'day'), to: lastDay};
		case ObjectiveTimeFrameKind.HALF_YEAR:
			if (timeFrame.till === ObjectiveTimeFrameTill.SPECIFIED) {
				return {from: lastDay.subtract(6, 'month').add(1, 'day'), to: lastDay};
			} else {
				return {from: lastDay.subtract(5, 'month').date(1), to: lastDay};
			}
		case ObjectiveTimeFrameKind.QUARTER:
			return {from: lastDay.subtract(1, 'quarter').add(1, 'day'), to: lastDay};
		case ObjectiveTimeFrameKind.MONTH:
			if (timeFrame.till === ObjectiveTimeFrameTill.SPECIFIED) {
				return {from: lastDay.subtract(1, 'month').add(1, 'day'), to: lastDay};
			} else {
				return {from: lastDay.date(1), to: lastDay};
			}
		case ObjectiveTimeFrameKind.WEEK_OF_YEAR:
			return {from: lastDay.subtract(1, 'week').add(1, 'day'), to: lastDay};
		case ObjectiveTimeFrameKind.DAY_OF_MONTH:
		case ObjectiveTimeFrameKind.DAY_OF_WEEK:
			return {from: lastDay, to: lastDay};
		case ObjectiveTimeFrameKind.LAST_N_YEARS:
			return {from: lastDay.subtract(computeLastN(timeFrame), 'year').add(1, 'day'), to: lastDay};
		case ObjectiveTimeFrameKind.LAST_N_MONTHS:
			return {from: lastDay.subtract(computeLastN(timeFrame), 'month').add(1, 'day'), to: lastDay};
		case ObjectiveTimeFrameKind.LAST_N_WEEKS:
			return {from: lastDay.subtract(computeLastN(timeFrame), 'week').add(1, 'day'), to: lastDay};
		case ObjectiveTimeFrameKind.LAST_N_DAYS:
			return {from: lastDay, to: lastDay};
		default:
			return (void 0);
	}
};

const renderTimeFrame = (frame?: Frame): string => {
	if (frame == null) {
		return '';
	} else {
		return frame.from.format('YYYY/MM/DD') + ' ~ ' + frame.to.format('YYYY/MM/DD');
	}
};

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
		console.log(value)
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

	const currentFrame = computeFrame(timeFrame);

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
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_CALCULATED}</ItemLabel>
			<ItemValue>{renderTimeFrame(currentFrame)}</ItemValue>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_PREVIOUS_CYCLE}</ItemLabel>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_CHAIN_CYCLE}</ItemLabel>
		</TimeFrameContainer>
	</EditStep>;
};