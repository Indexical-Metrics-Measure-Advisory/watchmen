import {ConvergenceTimeFrameVariable, ConvergenceTimeFrameVariableKind} from '@/services/data/tuples/convergence-types';
import {formatTime, getCurrentTime} from '@/services/data/utils';
import dayjs, {Dayjs, ManipulateType} from 'dayjs';

const computeRangeValues = (till: Dayjs, times: number) => (unit: ManipulateType, multiply: number = 1) => {
	const eom = till.date() === till.daysInMonth();
	const byMonth = unit === 'month';
	if (eom && byMonth) {
		return new Array(times).fill(1).map((_, index) => {
			return {
				start: formatTime(till.subtract((index + 1) * multiply, unit).startOf('month').startOf('day')),
				end: formatTime(till.subtract(index * multiply, unit).endOf('month').endOf('day'))
			};
		}).reverse();
	} else {
		return new Array(times).fill(1).map((_, index) => {
			return {
				start: formatTime(till.subtract((index + 1) * multiply, unit).add(1, 'day').startOf('day')),
				end: formatTime(till.subtract(index * multiply, unit).endOf('day'))
			};
		}).reverse();
	}
};

export const computeTimeFrameValues = (variable: ConvergenceTimeFrameVariable): number => {
	const times = Math.max(1, isNaN(Number(variable.times)) ? 1 : Number(variable.times));
	const till = dayjs(variable.till || getCurrentTime().substring(0, 10));
	const compute = computeRangeValues(till, times);
	switch (variable.kind) {
		case ConvergenceTimeFrameVariableKind.DAY:
			variable.values = compute('day');
			break;
		case ConvergenceTimeFrameVariableKind.WEEK:
			variable.values = compute('week');
			break;
		case ConvergenceTimeFrameVariableKind.MONTH:
			variable.values = compute('month');
			break;
		case ConvergenceTimeFrameVariableKind.QUARTER:
			variable.values = compute('month', 3);
			break;
		case ConvergenceTimeFrameVariableKind.HALF_YEAR:
			variable.values = compute('month', 6);
			break;
		case ConvergenceTimeFrameVariableKind.YEAR:
			variable.values = compute('year');
			break;
	}
	return times;
};