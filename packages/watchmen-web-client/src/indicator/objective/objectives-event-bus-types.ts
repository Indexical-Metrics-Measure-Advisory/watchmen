import {TuplePage} from '@/services/data/query/tuple-page';
import {Bucket, BucketId} from '@/services/data/tuples/bucket-types';
import {Indicator, IndicatorId} from '@/services/data/tuples/indicator-types';
import {Objective, ObjectiveFactor, ObjectiveId, ObjectiveTarget} from '@/services/data/tuples/objective-types';
import {QueryBucket, QueryByBucketMethod} from '@/services/data/tuples/query-bucket-types';
import {SubjectForIndicator} from '@/services/data/tuples/query-indicator-types';
import {QueryObjective} from '@/services/data/tuples/query-objective-types';
import {QueryUserGroupForHolder} from '@/services/data/tuples/query-user-group-types';
import {SubjectId} from '@/services/data/tuples/subject-types';
import {Topic, TopicId} from '@/services/data/tuples/topic-types';

export enum ObjectivesEventTypes {
	SEARCHED = 'searched',
	ASK_SEARCHED = 'ask-searched',

	CREATE_OBJECTIVE = 'create-objective',
	PICK_OBJECTIVE = 'pick-objective',

	ASK_OBJECTIVE = 'ask-objective',
	SAVE_OBJECTIVE = 'save-objective',
	OBJECTIVE_SAVED = 'objective-saved',

	FACTOR_NAME_CHANGED = 'factor-name-changed',
	FACTOR_ADDED = 'factor-added',
	FACTOR_REMOVED = 'factor-removed',

	TARGET_ASIS_TYPE_CHANGED = 'target-as-is-type-changed',

	ASK_ALL_BUCKETS = 'ask-all-buckets',
	ASK_BUCKET_IDS_BY_MEASURE = 'ask-bucket-id-by-measure',
	ASK_BUCKETS = 'ask-buckets-details',
	ASK_BUCKET = 'ask-bucket',

	ASK_ALL_USER_GROUPS = 'ask-all-user-groups',

	ASK_ALL_INDICATORS = 'ask-all-indicators',
	ASK_INDICATOR = 'ask-indicator',
	ASK_TOPIC = 'ask-topic',
	ASK_SUBJECT = 'ask-subject',
}

export interface ObjectivesEventBus {
	fire(type: ObjectivesEventTypes.SEARCHED, page: TuplePage<QueryObjective>, searchText: string): this;
	on(type: ObjectivesEventTypes.SEARCHED, listener: (page: TuplePage<QueryObjective>, searchText: string) => void): this;
	off(type: ObjectivesEventTypes.SEARCHED, listener: (page: TuplePage<QueryObjective>, searchText: string) => void): this;

	fire(type: ObjectivesEventTypes.ASK_SEARCHED, onData: (page?: TuplePage<QueryObjective>, searchText?: string) => void): this;
	on(type: ObjectivesEventTypes.ASK_SEARCHED, listener: (onData: (page?: TuplePage<QueryObjective>, searchText?: string) => void) => void): this;
	off(type: ObjectivesEventTypes.ASK_SEARCHED, listener: (onData: (page?: TuplePage<QueryObjective>, searchText?: string) => void) => void): this;

	fire(type: ObjectivesEventTypes.CREATE_OBJECTIVE, onCreated: (objective: Objective) => void): this;
	on(type: ObjectivesEventTypes.CREATE_OBJECTIVE, listener: (onCreated: (objective: Objective) => void) => void): this;
	off(type: ObjectivesEventTypes.CREATE_OBJECTIVE, listener: (onCreated: (objective: Objective) => void) => void): this;

	fire(type: ObjectivesEventTypes.PICK_OBJECTIVE, objectiveId: ObjectiveId, onData: (objective: Objective) => void): this;
	on(type: ObjectivesEventTypes.PICK_OBJECTIVE, listener: (objectiveId: ObjectiveId, onData: (objective: Objective) => void) => void): this;
	off(type: ObjectivesEventTypes.PICK_OBJECTIVE, listener: (objectiveId: ObjectiveId, onData: (objective: Objective) => void) => void): this;

	fire(type: ObjectivesEventTypes.ASK_OBJECTIVE, onData: (objective?: Objective) => void): this;
	on(type: ObjectivesEventTypes.ASK_OBJECTIVE, listener: (onData: (objective?: Objective) => void) => void): this;
	off(type: ObjectivesEventTypes.ASK_OBJECTIVE, listener: (onData: (objective?: Objective) => void) => void): this;

	fire(type: ObjectivesEventTypes.SAVE_OBJECTIVE, objective: Objective, onSaved: (objective: Objective, saved: boolean) => void): this;
	on(type: ObjectivesEventTypes.SAVE_OBJECTIVE, listener: (objective: Objective, onSaved: (objective: Objective, saved: boolean) => void) => void): this;
	off(type: ObjectivesEventTypes.SAVE_OBJECTIVE, listener: (objective: Objective, onSaved: (objective: Objective, saved: boolean) => void) => void): this;

	fire(type: ObjectivesEventTypes.OBJECTIVE_SAVED, objective: Objective): this;
	on(type: ObjectivesEventTypes.OBJECTIVE_SAVED, listener: (objective: Objective) => void): this;
	off(type: ObjectivesEventTypes.OBJECTIVE_SAVED, listener: (objective: Objective) => void): this;

	fire(type: ObjectivesEventTypes.FACTOR_NAME_CHANGED, objective: Objective, factor: ObjectiveFactor): this;
	on(type: ObjectivesEventTypes.FACTOR_NAME_CHANGED, listener: (objective: Objective, factor: ObjectiveFactor) => void): this;
	off(type: ObjectivesEventTypes.FACTOR_NAME_CHANGED, listener: (objective: Objective, factor: ObjectiveFactor) => void): this;

	fire(type: ObjectivesEventTypes.FACTOR_ADDED, objective: Objective, factor: ObjectiveFactor): this;
	on(type: ObjectivesEventTypes.FACTOR_ADDED, listener: (objective: Objective, factor: ObjectiveFactor) => void): this;
	off(type: ObjectivesEventTypes.FACTOR_ADDED, listener: (objective: Objective, factor: ObjectiveFactor) => void): this;

	fire(type: ObjectivesEventTypes.FACTOR_REMOVED, objective: Objective, factor: ObjectiveFactor): this;
	on(type: ObjectivesEventTypes.FACTOR_REMOVED, listener: (objective: Objective, factor: ObjectiveFactor) => void): this;
	off(type: ObjectivesEventTypes.FACTOR_REMOVED, listener: (objective: Objective, factor: ObjectiveFactor) => void): this;

	fire(type: ObjectivesEventTypes.TARGET_ASIS_TYPE_CHANGED, objective: Objective, target: ObjectiveTarget): this;
	on(type: ObjectivesEventTypes.TARGET_ASIS_TYPE_CHANGED, listener: (objective: Objective, target: ObjectiveTarget) => void): this;
	off(type: ObjectivesEventTypes.TARGET_ASIS_TYPE_CHANGED, listener: (objective: Objective, target: ObjectiveTarget) => void): this;

	fire(type: ObjectivesEventTypes.ASK_ALL_BUCKETS, onData: (buckets: Array<QueryBucket>) => void): this;
	on(type: ObjectivesEventTypes.ASK_ALL_BUCKETS, listener: (onData: (buckets: Array<QueryBucket>) => void) => void): this;
	off(type: ObjectivesEventTypes.ASK_ALL_BUCKETS, listener: (onData: (buckets: Array<QueryBucket>) => void) => void): this;

	fire(type: ObjectivesEventTypes.ASK_BUCKET_IDS_BY_MEASURE, method: QueryByBucketMethod, onData: (bucketIds: Array<BucketId>) => void): this;
	on(type: ObjectivesEventTypes.ASK_BUCKET_IDS_BY_MEASURE, listener: (method: QueryByBucketMethod, onData: (bucketIds: Array<BucketId>) => void) => void): this;
	off(type: ObjectivesEventTypes.ASK_BUCKET_IDS_BY_MEASURE, listener: (method: QueryByBucketMethod, onData: (bucketIds: Array<BucketId>) => void) => void): this;

	fire(type: ObjectivesEventTypes.ASK_BUCKETS, bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void): this;
	on(type: ObjectivesEventTypes.ASK_BUCKETS, listener: (bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void) => void): this;
	off(type: ObjectivesEventTypes.ASK_BUCKETS, listener: (bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void) => void): this;

	fire(type: ObjectivesEventTypes.ASK_BUCKET, bucketId: BucketId, onData: (bucket?: Bucket) => void): this;
	on(type: ObjectivesEventTypes.ASK_BUCKET, listener: (bucketId: BucketId, onData: (bucket?: Bucket) => void) => void): this;
	off(type: ObjectivesEventTypes.ASK_BUCKET, listener: (bucketId: BucketId, onData: (bucket?: Bucket) => void) => void): this;

	fire(type: ObjectivesEventTypes.ASK_ALL_USER_GROUPS, onData: (groups: Array<QueryUserGroupForHolder>) => void): this;
	on(type: ObjectivesEventTypes.ASK_ALL_USER_GROUPS, listener: (onData: (groups: Array<QueryUserGroupForHolder>) => void) => void): this;
	off(type: ObjectivesEventTypes.ASK_ALL_USER_GROUPS, listener: (onData: (groups: Array<QueryUserGroupForHolder>) => void) => void): this;

	fire(type: ObjectivesEventTypes.ASK_ALL_INDICATORS, onData: (groups: Array<Indicator>) => void): this;
	on(type: ObjectivesEventTypes.ASK_ALL_INDICATORS, listener: (onData: (groups: Array<Indicator>) => void) => void): this;
	off(type: ObjectivesEventTypes.ASK_ALL_INDICATORS, listener: (onData: (groups: Array<Indicator>) => void) => void): this;

	fire(type: ObjectivesEventTypes.ASK_INDICATOR, indicatorId: IndicatorId, onData: (indicator?: Indicator) => void): this;
	on(type: ObjectivesEventTypes.ASK_INDICATOR, listener: (indicatorId: IndicatorId, onData: (indicator?: Indicator) => void) => void): this;
	off(type: ObjectivesEventTypes.ASK_INDICATOR, listener: (indicatorId: IndicatorId, onData: (indicator?: Indicator) => void) => void): this;

	fire(type: ObjectivesEventTypes.ASK_TOPIC, topicId: TopicId, onData: (topic?: Topic) => void): this;
	on(type: ObjectivesEventTypes.ASK_TOPIC, listener: (topicId: TopicId, onData: (topic?: Topic) => void) => void): this;
	off(type: ObjectivesEventTypes.ASK_TOPIC, listener: (topicId: TopicId, onData: (topic?: Topic) => void) => void): this;

	fire(type: ObjectivesEventTypes.ASK_SUBJECT, subjectId: SubjectId, onData: (subject?: SubjectForIndicator) => void): this;
	on(type: ObjectivesEventTypes.ASK_SUBJECT, listener: (subjectId: SubjectId, onData: (subject?: SubjectForIndicator) => void) => void): this;
	off(type: ObjectivesEventTypes.ASK_SUBJECT, listener: (subjectId: SubjectId, onData: (subject?: SubjectForIndicator) => void) => void): this;
}