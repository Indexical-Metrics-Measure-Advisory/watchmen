import {Frame} from '@/indicator/objective/edit/time-frame/types';
import {
	Objective,
	ObjectiveTimeFrame,
	ObjectiveTimeFrameKind,
	ObjectiveTimeFrameTill
} from '@/services/data/tuples/objective-types';
import dayjs, {Dayjs} from 'dayjs';

export const guardKind = (kind?: ObjectiveTimeFrameKind): ObjectiveTimeFrameKind => kind || ObjectiveTimeFrameKind.MONTH;
const guardTill = (till?: ObjectiveTimeFrameTill): ObjectiveTimeFrameTill => till || ObjectiveTimeFrameTill.NOW;
export const lastN = (kind: ObjectiveTimeFrameKind) => [
	ObjectiveTimeFrameKind.LAST_N_YEARS, ObjectiveTimeFrameKind.LAST_N_MONTHS,
	ObjectiveTimeFrameKind.LAST_N_WEEKS, ObjectiveTimeFrameKind.LAST_N_DAYS
].includes(kind);
export const guardTimeFrame = (objective: Objective): ObjectiveTimeFrame => {
	if (objective.timeFrame == null) {
		objective.timeFrame = {
			kind: ObjectiveTimeFrameKind.MONTH,
			till: ObjectiveTimeFrameTill.NOW
		};
	}
	const timeFrame = objective.timeFrame;
	timeFrame.kind = guardKind(timeFrame.kind);
	if ([
		ObjectiveTimeFrameKind.LAST_N_YEARS, ObjectiveTimeFrameKind.LAST_N_MONTHS,
		ObjectiveTimeFrameKind.LAST_N_WEEKS, ObjectiveTimeFrameKind.LAST_N_DAYS
	].includes(timeFrame.kind) && (timeFrame.lastN || '').trim().length === 0) {
		timeFrame.lastN = '1';
	}
	timeFrame.till = guardTill(timeFrame.till);
	if (timeFrame.till === ObjectiveTimeFrameTill.SPECIFIED && (timeFrame.specifiedTill || '').trim().length === 0) {
		timeFrame.specifiedTill = dayjs().format('YYYY/MM/DD');
	}

	return timeFrame;
};
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
export const computeFrame = (def: ObjectiveTimeFrame): Frame | undefined => {
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
			if (lastDay.daysInMonth() === lastDay.date()) {
				return {from: lastDay.date(1).subtract(2, 'month'), to: lastDay};
			} else {
				return {from: lastDay.subtract(3, 'month').add(1, 'day'), to: lastDay};
			}
		case ObjectiveTimeFrameKind.MONTH:
			if (lastDay.daysInMonth() === lastDay.date()) {
				return {from: lastDay.date(1), to: lastDay};
			} else {
				return {from: lastDay.subtract(1, 'month').add(1, 'day'), to: lastDay};
			}
		case ObjectiveTimeFrameKind.WEEK_OF_YEAR:
			return {from: lastDay.subtract(6, 'day'), to: lastDay};
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
			return {from: lastDay.subtract(n * 7 - 1, 'day'), to: lastDay};
		case ObjectiveTimeFrameKind.LAST_N_DAYS:
			return {from: lastDay.subtract(n - 1), to: lastDay};
		case ObjectiveTimeFrameKind.NONE:
		default:
			return (void 0);
	}
};
export const computePreviousFrame = (def: ObjectiveTimeFrame, current?: Frame) => {
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
export const computeChainFrame = (def: ObjectiveTimeFrame, current?: Frame) => {
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
			return {from: from.subtract(n * 2, 'year'), to: from.subtract(1, 'day').subtract(n, 'year')};
		case ObjectiveTimeFrameKind.LAST_N_MONTHS:
			return {from: from.subtract(1, 'year'), to: to.subtract(1, 'year')};
		case ObjectiveTimeFrameKind.LAST_N_WEEKS:
			return {from: from.subtract(1, 'year'), to: to.subtract(1, 'year')};
		case ObjectiveTimeFrameKind.LAST_N_DAYS:
			return {from: from.subtract(1, 'year'), to: to.subtract(1, 'year')};
		case ObjectiveTimeFrameKind.NONE:
		default:
			return (void 0);
	}
};
export const renderTimeFrame = (frame?: Frame): string => {
	if (frame == null) {
		return '';
	} else {
		return frame.from.format('YYYY/MM/DD') + ' ~ ' + frame.to.format('YYYY/MM/DD');
	}
};