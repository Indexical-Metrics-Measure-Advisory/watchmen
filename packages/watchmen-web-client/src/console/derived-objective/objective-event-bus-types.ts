import {Bucket, BucketId} from '@/services/data/tuples/bucket-types';
import {IndicatorId} from '@/services/data/tuples/indicator-types';
import {ObjectiveValues} from '@/services/data/tuples/objective-types';
import {QueryBucket, QueryByBucketMethod} from '@/services/data/tuples/query-bucket-types';
import {Topic, TopicId} from '@/services/data/tuples/topic-types';
import {IndicatorData} from './types';

export enum ObjectiveEventTypes {
	SAVE = 'save',
	SAVED = 'saved',

	ASK_ALL_BUCKETS = 'ask-all-buckets',
	ASK_BUCKET_IDS_BY_MEASURE = 'ask-bucket-id-by-measure',
	ASK_BUCKETS = 'ask-buckets-details',
	ASK_BUCKET = 'ask-bucket',

	ASK_INDICATOR_DATA = 'ask-indicator-data',
	ASK_TOPIC = 'ask-topic',

	ASK_VALUES = 'ask-values',
	VALUES_FETCHED = 'values-fetched',

	SWITCH_VARIABLES_VISIBLE = 'switch-variables-visible'
}

export interface ObjectiveEventBus {
	fire(type: ObjectiveEventTypes.SAVE, onSaved: (saved: boolean) => void, immediately?: boolean): this;
	on(type: ObjectiveEventTypes.SAVE, listener: (onSaved: (saved: boolean) => void, immediately?: boolean) => void): this;
	off(type: ObjectiveEventTypes.SAVE, listener: (onSaved: (saved: boolean) => void, immediately?: boolean) => void): this;

	fire(type: ObjectiveEventTypes.SAVED): this;
	on(type: ObjectiveEventTypes.SAVED, listener: () => void): this;
	off(type: ObjectiveEventTypes.SAVED, listener: () => void): this;

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

	fire(type: ObjectiveEventTypes.ASK_INDICATOR_DATA, indicatorId: IndicatorId, onData: (data?: IndicatorData) => void): this;
	on(type: ObjectiveEventTypes.ASK_INDICATOR_DATA, listener: (indicatorId: IndicatorId, onData: (data?: IndicatorData) => void) => void): this;
	off(type: ObjectiveEventTypes.ASK_INDICATOR_DATA, listener: (indicatorId: IndicatorId, onData: (data?: IndicatorData) => void) => void): this;

	fire(type: ObjectiveEventTypes.ASK_TOPIC, topicId: TopicId, onData: (topic?: Topic) => void): this;
	on(type: ObjectiveEventTypes.ASK_TOPIC, listener: (topicId: TopicId, onData: (topic?: Topic) => void) => void): this;
	off(type: ObjectiveEventTypes.ASK_TOPIC, listener: (topicId: TopicId, onData: (topic?: Topic) => void) => void): this;

	fire(type: ObjectiveEventTypes.ASK_VALUES): this;
	on(type: ObjectiveEventTypes.ASK_VALUES, listener: () => void): this;
	off(type: ObjectiveEventTypes.ASK_VALUES, listener: () => void): this;

	fire(type: ObjectiveEventTypes.VALUES_FETCHED, values: ObjectiveValues): this;
	on(type: ObjectiveEventTypes.VALUES_FETCHED, listener: (values: ObjectiveValues) => void): this;
	off(type: ObjectiveEventTypes.VALUES_FETCHED, listener: (values: ObjectiveValues) => void): this;

	fire(type: ObjectiveEventTypes.SWITCH_VARIABLES_VISIBLE, switchTo: boolean): this;
	on(type: ObjectiveEventTypes.SWITCH_VARIABLES_VISIBLE, listener: (switchTo: boolean) => void): this;
	off(type: ObjectiveEventTypes.SWITCH_VARIABLES_VISIBLE, listener: (switchTo: boolean) => void): this;
}