import {
	OTHER_CATEGORY_SEGMENT_VALUE,
	type MetricBucketInclude,
	type MetricBucketMeasure,
	type MetricBucketRangeValue,
	type MetricBucketSegment,
	type MetricBucketType
} from '@/model/metricBucket';

export type MetricBucketValidationCode =
	| 'nameRequired'
	| 'measureRequired'
	| 'enumRequired'
	| 'segmentsRequired'
	| 'segmentNameRequired'
	| 'segmentNameDuplicate'
	| 'rangeRequired'
	| 'rangeInvalid'
	| 'rangeNotContinuous'
	| 'categoryValueRequired'
	| 'categoryValueDuplicate'
	| 'categoryOtherExclusive';

export interface MetricBucketValidationIssue {
	code: MetricBucketValidationCode;
	segmentIndex?: number;
}

export interface MetricBucketValidationInput {
	name: string;
	type?: MetricBucketType;
	measure?: MetricBucketMeasure;
	enumId?: string;
	segments: MetricBucketSegment[];
}

export const isNumericMetricBucketType = (type?: MetricBucketType): boolean =>
	type === undefined || type === 'value' || type === 'value-measure';

export const isMetricBucketRangeValue = (value: MetricBucketSegment['value']): value is MetricBucketRangeValue =>
	!Array.isArray(value);

const parseBound = (value?: string): number | undefined => {
	if (value === undefined || value.trim() === '') {
		return undefined;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : Number.NaN;
};

export const validateMetricBucket = ({
	name,
	type = 'value',
	measure,
	enumId,
	segments
}: MetricBucketValidationInput): MetricBucketValidationIssue[] => {
	const issues: MetricBucketValidationIssue[] = [];
	if (!name.trim()) {
		issues.push({ code: 'nameRequired' });
	}
	if (type !== 'value' && !measure) {
		issues.push({ code: 'measureRequired' });
	}
	if (type === 'enum-measure' && !enumId?.trim()) {
		issues.push({ code: 'enumRequired' });
	}
	if (segments.length === 0) {
		issues.push({ code: 'segmentsRequired' });
		return issues;
	}

	const segmentNames = new Set<string>();
	const categoryValues = new Set<string>();
	segments.forEach((segment, index) => {
		const segmentName = segment.name.trim();
		if (!segmentName) {
			issues.push({ code: 'segmentNameRequired', segmentIndex: index });
		} else if (segmentNames.has(segmentName)) {
			issues.push({ code: 'segmentNameDuplicate', segmentIndex: index });
		} else {
			segmentNames.add(segmentName);
		}

		if (isNumericMetricBucketType(type)) {
			if (!isMetricBucketRangeValue(segment.value)) {
				issues.push({ code: 'rangeInvalid', segmentIndex: index });
				return;
			}
			const min = parseBound(segment.value.min);
			const max = parseBound(segment.value.max);
			if (min === undefined && max === undefined) {
				issues.push({ code: 'rangeRequired', segmentIndex: index });
			} else if (Number.isNaN(min) || Number.isNaN(max) || (min !== undefined && max !== undefined && min >= max)) {
				issues.push({ code: 'rangeInvalid', segmentIndex: index });
			}

			if (index > 0) {
				const previousValue = segments[index - 1].value;
				const previousMax = isMetricBucketRangeValue(previousValue) ? parseBound(previousValue.max) : undefined;
				if (previousMax === undefined || min === undefined || previousMax !== min) {
					issues.push({ code: 'rangeNotContinuous', segmentIndex: index });
				}
			}
			return;
		}

		if (!Array.isArray(segment.value) || segment.value.length === 0) {
			issues.push({ code: 'categoryValueRequired', segmentIndex: index });
			return;
		}
		if (segment.value.includes(OTHER_CATEGORY_SEGMENT_VALUE) && segment.value.length > 1) {
			issues.push({ code: 'categoryOtherExclusive', segmentIndex: index });
		}
		segment.value.forEach(rawValue => {
			const value = rawValue.trim();
			if (!value) {
				issues.push({ code: 'categoryValueRequired', segmentIndex: index });
			} else if (categoryValues.has(value)) {
				issues.push({ code: 'categoryValueDuplicate', segmentIndex: index });
			} else {
				categoryValues.add(value);
			}
		});
	});
	return issues;
};

export const formatMetricBucketSegment = (
	segment: MetricBucketSegment,
	include: MetricBucketInclude = 'include-min'
): string => {
	if (Array.isArray(segment.value)) {
		return `${segment.name}: ${segment.value.join(', ')}`;
	}
	const min = segment.value.min?.trim() || '-∞';
	const max = segment.value.max?.trim() || '+∞';
	return `${segment.name}: ${include === 'include-min' ? '[' : '('}${min}, ${max}${include === 'include-min' ? ')' : ']'}`;
};

export const formatMetricBucketSegments = (
	segments: MetricBucketSegment[],
	include: MetricBucketInclude = 'include-min'
): string => segments.map(segment => formatMetricBucketSegment(segment, include)).join(' · ');
