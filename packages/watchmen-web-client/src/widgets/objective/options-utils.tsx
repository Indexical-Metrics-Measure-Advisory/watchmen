import {
	ObjectiveTimeFrame,
	ObjectiveTimeFrameKind,
	ObjectiveTimeFrameTill
} from '@/services/data/tuples/objective-types';
import {DropdownOption} from '../basic/types';
import {Lang} from '../langs';

export const buildKindOptions = (): Array<DropdownOption> => {
	return [
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
};
export const buildTillOptions = (): Array<DropdownOption> => {
	return [
		{value: ObjectiveTimeFrameTill.NOW, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TILL_NOW},
		{
			value: ObjectiveTimeFrameTill.LAST_COMPLETE_CYCLE,
			label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TILL_LAST_COMPLETE_CYCLE
		},
		{value: ObjectiveTimeFrameTill.SPECIFIED, label: Lang.INDICATOR.OBJECTIVE.TIME_FRAME_TILL_SPECIFIED}
	];
};
export const buildLastNOptions = (def: ObjectiveTimeFrame): Array<DropdownOption> => {
	const buildOptions = (count: number): Array<DropdownOption> => {
		return new Array(count).fill(1).map((_, index) => {
			return {value: `${index + 1}`, label: `${index + 1}`};
		});
	};
	switch (def.kind) {
		case ObjectiveTimeFrameKind.LAST_N_YEARS:
			return buildOptions(10);
		case ObjectiveTimeFrameKind.LAST_N_MONTHS:
			return buildOptions(60);
		case ObjectiveTimeFrameKind.LAST_N_WEEKS:
			return buildOptions(54);
		case ObjectiveTimeFrameKind.LAST_N_DAYS:
			return buildOptions(366);
		default:
			return [] as Array<DropdownOption>;
	}
};
const buildTimeFrameKinds = (): Record<ObjectiveTimeFrameKind, string> => {
	return {
		[ObjectiveTimeFrameKind.NONE]: Lang.CONSOLE.DERIVED_OBJECTIVE.NOT_TIME_RELATED,
		[ObjectiveTimeFrameKind.YEAR]: Lang.CONSOLE.DERIVED_OBJECTIVE.TIME_FRAME_KIND_YEAR,
		[ObjectiveTimeFrameKind.HALF_YEAR]: Lang.CONSOLE.DERIVED_OBJECTIVE.TIME_FRAME_KIND_HALF_YEAR,
		[ObjectiveTimeFrameKind.QUARTER]: Lang.CONSOLE.DERIVED_OBJECTIVE.TIME_FRAME_KIND_QUARTER,
		[ObjectiveTimeFrameKind.MONTH]: Lang.CONSOLE.DERIVED_OBJECTIVE.TIME_FRAME_KIND_MONTH,
		[ObjectiveTimeFrameKind.WEEK_OF_YEAR]: Lang.CONSOLE.DERIVED_OBJECTIVE.TIME_FRAME_KIND_WEEK_OF_YEAR,
		[ObjectiveTimeFrameKind.DAY_OF_MONTH]: Lang.CONSOLE.DERIVED_OBJECTIVE.TIME_FRAME_KIND_DAY_OF_MONTH,
		[ObjectiveTimeFrameKind.DAY_OF_WEEK]: Lang.CONSOLE.DERIVED_OBJECTIVE.TIME_FRAME_KIND_DAY_OF_WEEK,
		[ObjectiveTimeFrameKind.LAST_N_YEARS]: Lang.CONSOLE.DERIVED_OBJECTIVE.TIME_FRAME_KIND_LAST_N_YEARS,
		[ObjectiveTimeFrameKind.LAST_N_MONTHS]: Lang.CONSOLE.DERIVED_OBJECTIVE.TIME_FRAME_KIND_LAST_N_MONTHS,
		[ObjectiveTimeFrameKind.LAST_N_WEEKS]: Lang.CONSOLE.DERIVED_OBJECTIVE.TIME_FRAME_KIND_LAST_N_WEEKS,
		[ObjectiveTimeFrameKind.LAST_N_DAYS]: Lang.CONSOLE.DERIVED_OBJECTIVE.TIME_FRAME_KIND_LAST_N_DAYS
	};
};
export const findTimeFrameKindLabel = (timeFrame?: ObjectiveTimeFrame): string => {
	return timeFrame?.kind == null
		? Lang.CONSOLE.DERIVED_OBJECTIVE.NOT_TIME_RELATED
		: buildTimeFrameKinds()[timeFrame.kind];
};
