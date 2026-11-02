import { describe, expect, it } from 'vitest';
import type { MetricBucketSegment } from '@/model/metricBucket';
import {
	formatMetricBucketSegment,
	validateMetricBucket
} from '@/utils/metricBucket';

const segment = (name: string, min?: string, max?: string): MetricBucketSegment => ({
	name,
	value: { min, max }
});

describe('validateMetricBucket', () => {
	it('accepts continuous open ranges', () => {
		expect(validateMetricBucket({
			name: 'Age',
			segments: [segment('Young', undefined, '18'), segment('Adult', '18', '65'), segment('Senior', '65')]
		})).toEqual([]);
	});

	it('requires a bucket name and at least one segment', () => {
		expect(validateMetricBucket({ name: ' ', segments: [] })).toEqual([
			{ code: 'nameRequired' },
			{ code: 'segmentsRequired' }
		]);
	});

	it('rejects missing and duplicate segment names', () => {
		expect(validateMetricBucket({
			name: 'Age',
			segments: [segment('Adult', '0', '10'), segment(' ', '10', '20'), segment('Adult', '20')]
		})).toEqual([
			{ code: 'segmentNameRequired', segmentIndex: 1 },
			{ code: 'segmentNameDuplicate', segmentIndex: 2 }
		]);
	});

	it('rejects empty, non-numeric and inverted ranges', () => {
		expect(validateMetricBucket({
			name: 'Age',
			segments: [
				segment('Empty'),
				segment('Invalid', 'abc', '10'),
				segment('Inverted', '20', '10')
			]
		})).toEqual(expect.arrayContaining([
			{ code: 'rangeRequired', segmentIndex: 0 },
			{ code: 'rangeInvalid', segmentIndex: 1 },
			{ code: 'rangeInvalid', segmentIndex: 2 }
		]));
	});

	it('rejects gaps, overlaps and open boundaries between adjacent segments', () => {
		expect(validateMetricBucket({
			name: 'Age',
			segments: [segment('Low', '0', '10'), segment('Gap', '11', '20'), segment('Overlap', '19')]
		})).toEqual([
			{ code: 'rangeNotContinuous', segmentIndex: 1 },
			{ code: 'rangeNotContinuous', segmentIndex: 2 }
		]);
		expect(validateMetricBucket({
			name: 'Age',
			segments: [segment('Low', '0'), segment('High', undefined, '10')]
		})).toEqual([{ code: 'rangeNotContinuous', segmentIndex: 1 }]);
	});

	it('accepts valid category and enum buckets', () => {
		expect(validateMetricBucket({
			name: 'Region', type: 'category-measure', measure: 'region',
			segments: [{ name: 'Asia', value: ['CN', 'JP'] }, { name: 'Europe', value: ['GB', 'FR'] }]
		})).toEqual([]);
		expect(validateMetricBucket({
			name: 'Status', type: 'enum-measure', measure: 'enum', enumId: 'status',
			segments: [{ name: 'Active', value: ['A'] }, { name: 'Other', value: ['&others'] }]
		})).toEqual([]);
	});

	it('requires measure and enumeration for the corresponding types', () => {
		expect(validateMetricBucket({
			name: 'Category', type: 'category-measure', segments: [{ name: 'A', value: ['a'] }]
		})).toEqual([{ code: 'measureRequired' }]);
		expect(validateMetricBucket({
			name: 'Enum', type: 'enum-measure', measure: 'enum', segments: [{ name: 'A', value: ['a'] }]
		})).toEqual([{ code: 'enumRequired' }]);
	});

	it('rejects empty, duplicate and non-exclusive other category values', () => {
		expect(validateMetricBucket({
			name: 'Category', type: 'category-measure', measure: 'region',
			segments: [
				{ name: 'Empty', value: [] },
				{ name: 'First', value: ['A'] },
				{ name: 'Duplicate', value: ['A'] },
				{ name: 'Other', value: ['&others', 'B'] }
			]
		})).toEqual(expect.arrayContaining([
			{ code: 'categoryValueRequired', segmentIndex: 0 },
			{ code: 'categoryValueDuplicate', segmentIndex: 2 },
			{ code: 'categoryOtherExclusive', segmentIndex: 3 }
		]));
	});
});

describe('formatMetricBucketSegment', () => {
	it('shows open bounds and the selected including side', () => {
		expect(formatMetricBucketSegment(segment('Low', undefined, '10'), 'include-min'))
			.toBe('Low: [-∞, 10)');
		expect(formatMetricBucketSegment(segment('High', '10'), 'include-max'))
			.toBe('High: (10, +∞]');
	});

	it('formats category values without numeric boundaries', () => {
		expect(formatMetricBucketSegment({ name: 'Asia', value: ['CN', 'JP'] })).toBe('Asia: CN, JP');
	});
});
