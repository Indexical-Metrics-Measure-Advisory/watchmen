import {QueryBucket} from '@/services/data/tuples/query-bucket-types';

export interface Buckets {
	loaded: boolean;
	data: Array<QueryBucket>;
}
