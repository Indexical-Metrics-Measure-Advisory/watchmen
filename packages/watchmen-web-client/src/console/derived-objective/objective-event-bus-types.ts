import {Bucket, BucketId} from '@/services/data/tuples/bucket-types';
import {Indicator, IndicatorId} from '@/services/data/tuples/indicator-types';
import {Objective, ObjectiveValues} from '@/services/data/tuples/objective-types';
import {QueryBucket, QueryByBucketMethod} from '@/services/data/tuples/query-bucket-types';
import {SubjectForIndicator} from '@/services/data/tuples/query-indicator-types';
import {SubjectId} from '@/services/data/tuples/subject-types';
import {Topic, TopicId} from '@/services/data/tuples/topic-types';

export enum ObjectiveEventTypes {
	SAVE = 'save',
	SAVED = 'saved',

	ASK_ALL_BUCKETS = 'ask-all-buckets',
	ASK_BUCKET_IDS_BY_MEASURE = 'ask-bucket-id-by-measure',
	ASK_BUCKETS = 'ask-buckets-details',
	ASK_BUCKET = 'ask-bucket',

	ASK_ALL_INDICATORS = 'ask-all-indicators',
	ASK_INDICATOR = 'ask-indicator',
	ASK_TOPIC = 'ask-topic',
	ASK_SUBJECT = 'ask-subject',

	ASK_VALUES = 'ask-values',
	VALUES_FETCHED = 'values-fetched',

	SWITCH_VARIABLES_VISIBLE = 'switch-variables-visible'
}

export interface ObjectiveEventBus {
	fire(type: ObjectiveEventTypes.SAVE, objective: Objective, onSaved: (objective: Objective, saved: boolean) => void, immediately?: boolean): this;
	on(type: ObjectiveEventTypes.SAVE, listener: (objective: Objective, onSaved: (objective: Objective, saved: boolean) => void, immediately?: boolean) => void): this;
	off(type: ObjectiveEventTypes.SAVE, listener: (objective: Objective, onSaved: (objective: Objective, saved: boolean) => void, immediately?: boolean) => void): this;

	fire(type: ObjectiveEventTypes.SAVED, objective: Objective): this;
	on(type: ObjectiveEventTypes.SAVED, listener: (objective: Objective) => void): this;
	off(type: ObjectiveEventTypes.SAVED, listener: (objective: Objective) => void): this;

	fire(type: ObjectiveEventTypes.ASK_ALL_BUCKETS, onData: (buckets: Array<QueryBucket>) => void): this;
	on(type: ObjectiveEventTypes.ASK_ALL_BUCKETS, listener: (onData: (buckets: Array<QueryBucket>) => void) => void): this;
	off(type: ObjectiveEventTypes.ASK_ALL_BUCKETS, listener: (onData: (buckets: Array<QueryBucket>) => void) => void): this;

	fire(type: ObjectiveEventTypes.ASK_BUCKET_IDS_BY_MEASURE, method: QueryByBucketMethod, onData: (bucketIds: Array<BucketId>) => void): this;
	on(type: ObjectiveEventTypes.ASK_BUCKET_IDS_BY_MEASURE, listener: (method: QueryByBucketMethod, onData: (bucketIds: Array<BucketId>) => void) => void): this;
	off(type: ObjectiveEventTypes.ASK_BUCKET_IDS_BY_MEASURE, listener: (method: QueryByBucketMethod, onData: (bucketIds: Array<BucketId>) => void) => void): this;

	fire(type: ObjectiveEventTypes.ASK_BUCKETS, bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void): this;
	on(type: ObjectiveEventTypes.ASK_BUCKETS, listener: (bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void) => void): this;
	off(type: ObjectiveEventTypes.ASK_BUCKETS, listener: (bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void) => void): this;

	fire(type: ObjectiveEventTypes.ASK_BUCKET, bucketId: BucketId, onData: (bucket?: Bucket) => void): this;
	on(type: ObjectiveEventTypes.ASK_BUCKET, listener: (bucketId: BucketId, onData: (bucket?: Bucket) => void) => void): this;
	off(type: ObjectiveEventTypes.ASK_BUCKET, listener: (bucketId: BucketId, onData: (bucket?: Bucket) => void) => void): this;

	fire(type: ObjectiveEventTypes.ASK_ALL_INDICATORS, onData: (groups: Array<Indicator>) => void): this;
	on(type: ObjectiveEventTypes.ASK_ALL_INDICATORS, listener: (onData: (groups: Array<Indicator>) => void) => void): this;
	off(type: ObjectiveEventTypes.ASK_ALL_INDICATORS, listener: (onData: (groups: Array<Indicator>) => void) => void): this;

	fire(type: ObjectiveEventTypes.ASK_INDICATOR, indicatorId: IndicatorId, onData: (indicator?: Indicator) => void): this;
	on(type: ObjectiveEventTypes.ASK_INDICATOR, listener: (indicatorId: IndicatorId, onData: (indicator?: Indicator) => void) => void): this;
	off(type: ObjectiveEventTypes.ASK_INDICATOR, listener: (indicatorId: IndicatorId, onData: (indicator?: Indicator) => void) => void): this;

	fire(type: ObjectiveEventTypes.ASK_TOPIC, topicId: TopicId, onData: (topic?: Topic) => void): this;
	on(type: ObjectiveEventTypes.ASK_TOPIC, listener: (topicId: TopicId, onData: (topic?: Topic) => void) => void): this;
	off(type: ObjectiveEventTypes.ASK_TOPIC, listener: (topicId: TopicId, onData: (topic?: Topic) => void) => void): this;

	fire(type: ObjectiveEventTypes.ASK_SUBJECT, subjectId: SubjectId, onData: (subject?: SubjectForIndicator) => void): this;
	on(type: ObjectiveEventTypes.ASK_SUBJECT, listener: (subjectId: SubjectId, onData: (subject?: SubjectForIndicator) => void) => void): this;
	off(type: ObjectiveEventTypes.ASK_SUBJECT, listener: (subjectId: SubjectId, onData: (subject?: SubjectForIndicator) => void) => void): this;

	fire(type: ObjectiveEventTypes.ASK_VALUES): this;
	on(type: ObjectiveEventTypes.ASK_VALUES, listener: () => void): this;
	off(type: ObjectiveEventTypes.ASK_VALUES, listener: () => void): this;

	fire(type: ObjectiveEventTypes.VALUES_FETCHED, values: ObjectiveValues): this;
	on(type: ObjectiveEventTypes.VALUES_FETCHED, listener: (values: ObjectiveValues) => void): this;
	off(type: ObjectiveEventTypes.VALUES_FETCHED, listener: (values: ObjectiveValues) => void): this;

	fire(type: ObjectiveEventTypes.SWITCH_VARIABLES_VISIBLE): this;
	on(type: ObjectiveEventTypes.SWITCH_VARIABLES_VISIBLE, listener: () => void): this;
	off(type: ObjectiveEventTypes.SWITCH_VARIABLES_VISIBLE, listener: () => void): this;
}