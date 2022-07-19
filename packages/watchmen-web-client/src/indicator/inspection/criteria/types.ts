import {Bucket} from '@/services/data/tuples/bucket-types';
import {SubjectForIndicator} from '@/services/data/tuples/query-indicator-types';
import {Topic} from '@/services/data/tuples/topic-types';

export interface IndicatorCriteriaDefData {
	loaded: boolean;
	topic?: Topic;
	subject?: SubjectForIndicator;
	valueBuckets: Array<Bucket>;
	measureBuckets: Array<Bucket>;
}
