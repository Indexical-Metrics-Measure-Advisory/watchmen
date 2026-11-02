export type MetricBucketType = 'value' | 'value-measure' | 'category-measure' | 'enum-measure';

export type MetricBucketInclude = 'include-min' | 'include-max';

export const VALUE_MEASURE_METHODS = ['floor', 'residential-area', 'age', 'biz-scale'] as const;
export const CATEGORY_MEASURE_METHODS = [
	'continent', 'region', 'country', 'province', 'city', 'district', 'residence-type',
	'gender', 'occupation', 'religion', 'nationality', 'biz-trade', 'boolean'
] as const;

export type MetricBucketMeasure = typeof VALUE_MEASURE_METHODS[number]
	| typeof CATEGORY_MEASURE_METHODS[number]
	| 'enum';

export interface MetricBucketRangeValue {
	min?: string;
	max?: string;
}

export type MetricBucketSegmentValue = MetricBucketRangeValue | string[];

export interface MetricBucketSegment {
	name: string;
	value: MetricBucketSegmentValue;
}

export const OTHER_CATEGORY_SEGMENT_VALUE = '&others';

export interface MetricBucket {
	bucketId: string;
	name: string;
	type: MetricBucketType;
	include?: MetricBucketInclude;
	segments: MetricBucketSegment[];
	description?: string;
	measure?: MetricBucketMeasure;
	enumId?: string;
	tenantId?: string;
	version?: number;
	lastModifiedAt?: string;
}

export interface MetricBucketPageQuery {
	query_name?: string;
	pageNumber: number;
	pageSize: number;
}

export interface MetricBucketPageResult {
	data: MetricBucket[];
	itemCount: number;
	pageNumber: number;
	pageSize: number;
	pageCount: number;
}
