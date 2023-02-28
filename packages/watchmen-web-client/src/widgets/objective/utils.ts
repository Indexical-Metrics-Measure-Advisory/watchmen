import {ObjectiveTargetBetterSide, ObjectiveTargetValues} from '@/services/data/tuples/objective-types';
import {createNumberFormat} from '../report/chart-utils/number-format';

export type ParsedTobe =
	{ has: false; percentage: false; value: undefined }
	| { has: true; percentage: boolean; value: number }

export const fromTobe = (tobe?: string): ParsedTobe => {
	tobe = (tobe || '').trim();
	if (tobe.length === 0) {
		return {has: false, percentage: false, value: (void 0)};
	}

	if (tobe.endsWith('%')) {
		const tobeValue = Number(tobe.substring(0, tobe.length - 1));
		if (isNaN(tobeValue)) {
			return {has: false, percentage: false, value: (void 0)};
		} else {
			return {has: true, percentage: true, value: tobeValue};
		}
	} else {
		const tobeValue = Number(tobe);
		if (isNaN(tobeValue)) {
			return {has: false, percentage: false, value: (void 0)};
		} else {
			return {has: true, percentage: false, value: tobeValue};
		}
	}
};

export const asValue = (options: { value?: number; percentage: boolean }): number => {
	const {value, percentage} = options;
	if (percentage) {
		return (value ?? 0) * 100;
	} else {
		return value ?? 0;
	}
};

export const asValues = (options: { values: ObjectiveTargetValues, percentage: boolean }) => {
	const {values, percentage} = options;

	const current = asValue({value: values.currentValue, percentage});
	const previous = asValue({value: values.previousValue, percentage});
	const chain = asValue({value: values.chainValue, percentage});

	return {current, previous, chain};
};

export enum VolumeChange {
	INCREASE = 'increase',
	DECREASE = 'decrease',
	KEEP = 'keep'
}

const format = createNumberFormat(2, true);
const percentageFormat = createNumberFormat(1, true);
export const asDisplayValue = (options: { value: number, percentage: boolean }): string => {
	const {value, percentage} = options;
	if (percentage) {
		return percentageFormat(value) + '%';
	} else {
		return format(value);
	}
};
export const asFinishRatio = (options: { base: number, value: number }): string => {
	const {base, value} = options;
	if (base === 0) {
		return 'N/A';
	} else {
		return percentageFormat(value / base * 100) + '%';
	}
};

export enum BetterThanBase {
	TRUE = 'true',
	FALSE = 'false',
	KEEP = 'keep'
}

export interface IncreaseRatio {
	ratio: string;
	volume?: VolumeChange;
	better?: BetterThanBase;
}

export const asIncreaseRatio = (options: { base: number, value: number, betterSide?: ObjectiveTargetBetterSide }): IncreaseRatio => {
	const {base, value, betterSide} = options;
	if (base === 0) {
		return {ratio: 'N/A'};
	} else {
		const volume = value > base ? VolumeChange.INCREASE : (value < base ? VolumeChange.DECREASE : VolumeChange.KEEP);
		return {
			ratio: percentageFormat((value - base) / base * 100) + '%',
			volume,
			better: (() => {
				if (betterSide === ObjectiveTargetBetterSide.LESS) {
					if (value > base) {
						return BetterThanBase.FALSE;
					} else if (value < base) {
						return BetterThanBase.TRUE;
					} else {
						return BetterThanBase.KEEP;
					}
				} else {
					if (value > base) {
						return BetterThanBase.TRUE;
					} else if (value < base) {
						return BetterThanBase.FALSE;
					} else {
						return BetterThanBase.KEEP;
					}
				}
			})()
		};
	}
};
