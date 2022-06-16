import {isEnumMeasureBucket, isMeasureBucket} from '@/services/data/tuples/bucket-utils';
import {EnumId} from '@/services/data/tuples/enum-types';
import {MeasureMethod} from '@/services/data/tuples/indicator-types';
import {QueryBucket, QueryByBucketMethod} from '@/services/data/tuples/query-bucket-types';
import {isQueryByEnum} from '@/services/data/tuples/query-bucket-utils';

export const uniqueMeasureMethods = (methods: Array<QueryByBucketMethod>) => {
	return Object.values(methods.reduce((all, method) => {
		if (isQueryByEnum(method)) {
			const enumId = method.enumId;
			if (all[enumId] == null) {
				all[enumId] = method;
			}
		} else if (all[method.method as MeasureMethod] == null) {
			all[method.method as MeasureMethod] = method;
		}
		return all;
	}, {} as Record<string, QueryByBucketMethod>));
};

export const matchBuckets = (options: {
	methods: Array<MeasureMethod>;
	enumId?: EnumId;
	buckets: Array<QueryBucket>;
}): Array<QueryBucket> => {
	const {methods, enumId, buckets} = options;

	return [...new Set(methods)].map(method => {
		if (method === MeasureMethod.ENUM) {
			if (enumId != null) {
				// eslint-disable-next-line
				return buckets.filter(bucket => isEnumMeasureBucket(bucket) && bucket.enumId == enumId);
			} else {
				// no enumId assigned, then no bucket can be applied
				return [];
			}
		} else {
			return buckets.filter(bucket => isMeasureBucket(bucket) && bucket.measure === method);
		}
	}).flat().sort((b1, b2) => {
		return (b1.name || '').localeCompare(b2.name || '', void 0, {sensitivity: 'base', caseFirst: 'upper'});
	});
};