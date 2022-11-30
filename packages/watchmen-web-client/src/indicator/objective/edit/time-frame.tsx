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
	return isNaN(lastN) ? 1 : Math.floor(Math.abs(lastN));
};
const computeFrame = (def: ObjectiveTimeFrame): Frame | undefined => {
	const lastDay = computeLastDay(def);
	const n = computeLastN(def);
	switch (def.kind) {
		case ObjectiveTimeFrameKind.YEAR:
			if (lastDay.daysInMonth() === lastDay.date()) {
				return {from: lastDay.date(1).subtract(11, 'month'), to: lastDay};
			} else {
				return {from: lastDay.subtract(1, 'year').add(1, 'day'), to: lastDay};
			}
		case ObjectiveTimeFrameKind.HALF_YEAR:
			if (lastDay.daysInMonth() === lastDay.date()) {
				return {from: lastDay.date(1).subtract(5, 'month'), to: lastDay};
			} else {
				return {from: lastDay.subtract(6, 'month').add(1, 'day'), to: lastDay};
			}
		case ObjectiveTimeFrameKind.QUARTER:
			return {from: lastDay.subtract(1, 'quarter').add(1, 'day'), to: lastDay};
		case ObjectiveTimeFrameKind.MONTH:
			if (lastDay.daysInMonth() === lastDay.date()) {
				return {from: lastDay.date(1), to: lastDay};
			} else {
				return {from: lastDay.subtract(1, 'month').add(1, 'day'), to: lastDay};
			}
		case ObjectiveTimeFrameKind.WEEK_OF_YEAR:
			if (lastDay.day() === 6) {
				return {from: lastDay.day(0), to: lastDay};
			} else {
				return {from: lastDay.subtract(1, 'week').add(1, 'day'), to: lastDay};
			}
		case ObjectiveTimeFrameKind.DAY_OF_MONTH:
		case ObjectiveTimeFrameKind.DAY_OF_WEEK:
			return {from: lastDay, to: lastDay};
		case ObjectiveTimeFrameKind.LAST_N_YEARS:
			if (lastDay.daysInMonth() === lastDay.date()) {
				return {from: lastDay.date(1).subtract(11, 'month').subtract(n - 1, 'year'), to: lastDay};
			} else {
				return {from: lastDay.subtract(n, 'year').add(1, 'day'), to: lastDay};
			}
		case ObjectiveTimeFrameKind.LAST_N_MONTHS:
			if (lastDay.daysInMonth() === lastDay.date()) {
				return {from: lastDay.date(1).subtract(n - 1, 'month'), to: lastDay};
			} else {
				return {from: lastDay.subtract(n, 'month').add(1, 'day'), to: lastDay};
			}
		case ObjectiveTimeFrameKind.LAST_N_WEEKS:
			if (lastDay.day() === 6) {
				return {from: lastDay.day(0).subtract(n - 1, 'week'), to: lastDay};
			} else {
				return {from: lastDay.subtract(n, 'week').add(1, 'day'), to: lastDay};
			}
		case ObjectiveTimeFrameKind.LAST_N_DAYS:
			return {from: lastDay.subtract(n - 1), to: lastDay};
		case ObjectiveTimeFrameKind.NONE:
		default:
			return (void 0);
	}
};
const computePreviousFrame = (def: ObjectiveTimeFrame, current?: Frame) => {
	if (current == null) {
		return (void 0);
	}
	const from = current.from.clone();
	const n = computeLastN(def);
	switch (def.kind) {
		case ObjectiveTimeFrameKind.YEAR:
			return {from: from.subtract(1, 'year'), to: from.subtract(1, 'day')};
		case ObjectiveTimeFrameKind.HALF_YEAR:
			return {from: from.subtract(6, 'month'), to: from.subtract(1, 'day')};
		case ObjectiveTimeFrameKind.QUARTER:
			return {from: from.subtract(3, 'month'), to: from.subtract(1, 'day')};
		case ObjectiveTimeFrameKind.MONTH:
			return {from: from.subtract(1, 'month'), to: from.subtract(1, 'day')};
		case ObjectiveTimeFrameKind.WEEK_OF_YEAR:
			return {from: from.subtract(7, 'day'), to: from.subtract(1, 'day')};
		case ObjectiveTimeFrameKind.DAY_OF_MONTH:
		case ObjectiveTimeFrameKind.DAY_OF_WEEK:
			return {from: from.subtract(1, 'day'), to: from.subtract(1, 'day')};
		case ObjectiveTimeFrameKind.LAST_N_YEARS:
			return {from: from.subtract(n, 'year'), to: from.subtract(1, 'day')};
		case ObjectiveTimeFrameKind.LAST_N_MONTHS:
			return {from: from.subtract(n, 'month'), to: from.subtract(1, 'day')};
		case ObjectiveTimeFrameKind.LAST_N_WEEKS:
			return {from: from.subtract(n, 'week'), to: from.subtract(1, 'day')};
		case ObjectiveTimeFrameKind.LAST_N_DAYS:
			return {from: from.subtract(n, 'day'), to: from.subtract(1, 'day')};
		case ObjectiveTimeFrameKind.NONE:
		default:
			return (void 0);
	}
};
const computeChainFrame = (def: ObjectiveTimeFrame, current?: Frame) => {
	if (current == null) {
		return (void 0);
	}
	const {from, to} = {from: current.from.clone(), to: current.to.clone()};
	const n = computeLastN(def);
	switch (def.kind) {
		case ObjectiveTimeFrameKind.YEAR:
			return {from: from.subtract(1, 'year'), to: from.subtract(1, 'day')};
		case ObjectiveTimeFrameKind.HALF_YEAR:
		case ObjectiveTimeFrameKind.QUARTER:
		case ObjectiveTimeFrameKind.MONTH:
		case ObjectiveTimeFrameKind.WEEK_OF_YEAR:
			return {from: from.subtract(1, 'year'), to: to.subtract(1, 'year')};
		case ObjectiveTimeFrameKind.DAY_OF_MONTH:
			return {from: from.subtract(1, 'month'), to: to.subtract(1, 'month')};
		case ObjectiveTimeFrameKind.DAY_OF_WEEK:
			return {from: from.subtract(1, 'week'), to: to.subtract(1, 'week')};
		case ObjectiveTimeFrameKind.LAST_N_YEARS:
			return {from: from.subtract(n, 'year'), to: from.subtract(1, 'day')};
		case ObjectiveTimeFrameKind.LAST_N_MONTHS:
			return {from: from.subtract(n, 'month'), to: from.subtract(1, 'day')};
		case ObjectiveTimeFrameKind.LAST_N_WEEKS:
			return {from: from.subtract(n, 'week'), to: from.subtract(1, 'day')};
		case ObjectiveTimeFrameKind.LAST_N_DAYS:
			return {from: from.subtract(n, 'day'), to: from.subtract(1, 'day')};
		case ObjectiveTimeFrameKind.NONE:
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

	const def = guardTimeFrame(objective);

	const onKindChanged = (option: DropdownOption) => {
		def.kind = option.value as ObjectiveTimeFrameKind;
		guardTimeFrame(objective);
		save(objective);
	};
	const onLastNChanged = (event: ChangeEvent<HTMLInputElement>) => {
		def.lastN = event.target.value;
		save(objective);
	};
	const onTillChanged = (option: DropdownOption) => {
		def.till = option.value as ObjectiveTimeFrameTill;
		save(objective);
	};
	const onSpecifiedTillChanged = (value?: string) => {
		if (value?.includes(' ')) {
			value = value?.substring(0, value?.indexOf(' '));
		}
		def.specifiedTill = value ?? '';
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

	const isTimeRelated = def.kind !== ObjectiveTimeFrameKind.NONE;
	const isLastNKind = [
		ObjectiveTimeFrameKind.LAST_N_YEARS, ObjectiveTimeFrameKind.LAST_N_MONTHS,
		ObjectiveTimeFrameKind.LAST_N_WEEKS, ObjectiveTimeFrameKind.LAST_N_DAYS
	].includes(guardKind(def.kind));
	const isTillSpecified = def.till === ObjectiveTimeFrameTill.SPECIFIED;

	const currentFrame = computeFrame(def);
	const previousFrame = computePreviousFrame(def, currentFrame);
	const chainFrame = computeChainFrame(def, currentFrame);

	return <EditStep index={ObjectiveDeclarationStep.TIME_FRAME} title={Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TITLE}>
		<TimeFrameContainer timeRelated={isTimeRelated} lastN={isLastNKind} specifiedTill={isTillSpecified}>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_KIND}</ItemLabel>
			<Dropdown value={def.kind || ObjectiveTimeFrameTill.NOW} options={kindOptions}
			          onChange={onKindChanged}/>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_N_IS}</ItemLabel>
			<Input value={def.lastN || ''} onChange={onLastNChanged}/>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TILL}</ItemLabel>
			<Dropdown value={def.till || ObjectiveTimeFrameTill.NOW} options={tillOptions}
			          onChange={onTillChanged}/>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TILL_SPECIFIED_AT}</ItemLabel>
			<Calendar value={def.specifiedTill} onChange={onSpecifiedTillChanged} showTime={false}/>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TILL_SPECIFIED_AT_DESC}</ItemLabel>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_CALCULATED}</ItemLabel>
			<ItemValue>{renderTimeFrame(currentFrame)}</ItemValue>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_PREVIOUS_CYCLE}</ItemLabel>
			<ItemValue>{renderTimeFrame(previousFrame)}</ItemValue>
			<ItemLabel>{Lang.INDICATOR.OBJECTIVE.TIME_FRAME_CHAIN_CYCLE}</ItemLabel>
			<ItemValue>{renderTimeFrame(chainFrame)}</ItemValue>
		</TimeFrameContainer>
	</EditStep>;
};