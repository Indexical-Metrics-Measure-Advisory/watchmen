import {Bucket, BucketId} from '@/services/data/tuples/bucket-types';
import {
	Objective,
	ObjectiveTargetBetterSide,
	ObjectiveTargetValues,
	ObjectiveVariable,
	ObjectiveVariableOnBucket
} from '@/services/data/tuples/objective-types';
import {isBucketVariable} from '@/services/data/tuples/objective-utils';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {isNotBlank} from '@/services/utils';
import {DropdownOption} from '@/widgets/basic/types';
import styled from 'styled-components';
import {Lang} from '../langs';
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

interface BucketVariableOptions {
	buckets: Array<DropdownOption>,
	segments: Array<DropdownOption>
}

const IncorrectOptionLabel = styled.span.attrs({'data-widget': 'incorrect-option'})`
	color           : var(--danger-color);
	text-decoration : line-through;
`;

export const buildBucketOptions = (
	variable: ObjectiveVariable, allBuckets: Array<QueryBucket>, selectedBucket: Bucket | null
): BucketVariableOptions => {
	if (!isBucketVariable(variable)) {
		return {buckets: [], segments: []};
	}

	// build bucket options
	const bucketOptions: Array<DropdownOption> = allBuckets.map(bucket => {
		return {value: bucket.bucketId, label: bucket.name};
	}).sort((b1, b2) => {
		return (b1.label || '').toLowerCase().localeCompare((b2.label || '').toLowerCase());
	});
	const segmentOptions: Array<DropdownOption> = [];
	if (isNotBlank(variable.bucketId)) {
		// bucket selected
		// eslint-disable-next-line
		const found = allBuckets.find(b => b.bucketId == variable.bucketId);
		if (found == null) {
			// selected bucket not found, which means selected bucket doesn't exist anymore
			bucketOptions.push({
				value: variable.bucketId!, label: () => {
					return {
						node: <IncorrectOptionLabel>
							{Lang.INDICATOR.OBJECTIVE.VARIABLE_BUCKET_INCORRECT_SELECTED}
						</IncorrectOptionLabel>, label: ''
					};
				}
			} as DropdownOption);
			if (isNotBlank(variable.segmentName)) {
				// there is segment selected
				// since bucket is not found, which means segment is incorrect anyway
				segmentOptions.push({
					value: variable.segmentName, label: () => {
						return {
							node: <IncorrectOptionLabel>{variable.segmentName}</IncorrectOptionLabel>,
							label: variable.segmentName
						};
					}
				} as DropdownOption);
			} else {
				// there is no segment selected
				segmentOptions.push({value: '', label: Lang.INDICATOR.OBJECTIVE.VARIABLE_BUCKET_SELECT_FIRST});
			}
		} else if (selectedBucket != null) {
			// selected bucket found
			// build available segment options
			segmentOptions.push(...(selectedBucket.segments || []).map(segment => {
				return {value: segment.name, label: segment.name};
			}));
			if (isNotBlank(variable.segmentName)) {
				// there is segment selected
				// eslint-disable-next-line
				const found = (selectedBucket.segments || []).find(s => s.name == variable.segmentName);
				if (found == null) {
					// selected segment not found, which means it doesn't exist anymore
					segmentOptions.push({
						value: variable.segmentName, label: () => {
							return {
								node: <IncorrectOptionLabel>{variable.segmentName}</IncorrectOptionLabel>,
								label: variable.segmentName
							};
						}
					} as DropdownOption);
				}
			} else if (segmentOptions.length === 0) {
				segmentOptions.push({
					value: '',
					label: Lang.INDICATOR.OBJECTIVE.VARIABLE_BUCKET_SEGMENT_NO_AVAILABLE
				});
			}
		}

		return {buckets: bucketOptions, segments: segmentOptions};
	} else {
		// bucket not selected
		if (bucketOptions.length === 0) {
			// no available buckets
			bucketOptions.push({value: '', label: Lang.INDICATOR.OBJECTIVE.VARIABLE_BUCKET_NO_AVAILABLE});
		}
		segmentOptions.push({value: '', label: Lang.INDICATOR.OBJECTIVE.VARIABLE_BUCKET_SELECT_FIRST});
	}
	return {buckets: bucketOptions, segments: segmentOptions};
};

export const askVariableBucketIds = (objective: Objective): Array<BucketId> => {
	return (objective.variables || [])
		.filter(v => isBucketVariable(v) && isNotBlank(v.bucketId))
		.map(v => (v as ObjectiveVariableOnBucket).bucketId)
		.filter(bucketId => isNotBlank(bucketId)) as Array<BucketId>;
};