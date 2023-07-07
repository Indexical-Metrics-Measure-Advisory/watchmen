import {Bucket, NumericValueSegment} from '@/services/data/tuples/bucket-types';
import {
	isCategoryMeasureBucket,
	isEnumMeasureBucket,
	isNumericValueBucket,
	isNumericValueMeasureBucket
} from '@/services/data/tuples/bucket-utils';
import {base64Encode} from '@/services/utils';
import {EnumsMap} from './types';

const compareValue = (s1: NumericValueSegment, s2: NumericValueSegment) => {
	const min1 = s1.value?.min;
	const min2 = s2.value?.min;
	if (min1 == null) {
		return -1;
	} else if (min2 == null) {
		return 1;
	} else {
		const ret = parseFloat(min1) - parseFloat(min2);
		if (isNaN(ret)) {
			return -1;
		} else {
			return ret;
		}
	}
};
const generateSegments = (options: { bucket: Bucket; enumsMap: EnumsMap }): string => {
	const {bucket, enumsMap} = options;
	const segments = bucket.segments;
	if (segments == null || segments.length === 0) {
		return '> No segment.';
	}

	if (isNumericValueBucket(bucket)) {
		return `
| Name | Min Value | Max Value |
| ---- | --------- | --------- |
${bucket.segments.sort(compareValue).map(segment => {
			return `| ${segment.name} | ${segment.value?.min ?? ''} | ${segment.value?.max ?? ''} |`;
		}).join('\n')}
`;
	} else if (isNumericValueMeasureBucket(bucket)) {
		return `
Measure on: ${bucket.measure?.toUpperCase() ?? ''}

| Name | Min Value | Max Value |
| ---- | --------- | --------- |
${bucket.segments.sort(compareValue).map(segment => {
			return `| ${segment.name} | ${segment.value?.min ?? ''} | ${segment.value?.max ?? ''} |`;
		}).join('\n')}
`;
	} else if (isCategoryMeasureBucket(bucket)) {
		return `
Measure on: ${bucket.measure?.toUpperCase() ?? ''}

| Name | Values |
| ---- | ------ |
${bucket.segments.map(segment => {
			return `| ${segment.name} | ${segment.value?.sort().join(', ')}`;
		}).join('\n')}
`;
	} else if (isEnumMeasureBucket(bucket)) {
		return `
Measure on enumeration: ${enumsMap[bucket.enumId] ?? 'Enumeration not found.'}.

| Name | Values |
| ---- | ------ |
${bucket.segments.map(segment => {
			return `| ${segment.name} | ${segment.value?.sort().join(', ')}`;
		}).join('\n')}
`;
	} else {
		return 'Bucket type is not supported yet.';
	}
};

const generateBucketMarkdown = (options: {
	bucket: Bucket,
	enumsMap: EnumsMap;
	index: number,
	sectionIndex: number;
}): string => {
	const {bucket, enumsMap, index, sectionIndex} = options;

	return `## ${sectionIndex}.${index + 1}. ${bucket.name || 'Noname Bucket'} #${bucket.bucketId}<span id="bucket-${bucket.bucketId}"/>
${(bucket.description || '').replace(/\n/g, '  ').replace(/</g, '&lt;')}

<a href="data:application/json;base64,${base64Encode(JSON.stringify(bucket))}" target="_blank" download="${bucket.name || 'Noname Bucket'}-${bucket.bucketId}.json">Download Meta File</a>

${generateSegments({bucket, enumsMap})}
`;
};

export const generateBuckets = (options: {
	buckets: Array<Bucket>; enumsMap: EnumsMap; sectionIndex: number;
}): string => {
	const {buckets, enumsMap, sectionIndex} = options;

	if (buckets.length === 0) {
		return '> No bucket.';
	}

	return buckets.sort((t1, t2) => {
		return (t1.name || '').toLowerCase().localeCompare((t2.name || '').toLowerCase());
	}).map((bucket, index) => {
		return generateBucketMarkdown({bucket, enumsMap, index, sectionIndex});
	}).join('\n');
};
