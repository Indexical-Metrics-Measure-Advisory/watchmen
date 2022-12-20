import {TuplePage} from '@/services/data/query/tuple-page';
import {Bucket, BucketId} from '@/services/data/tuples/bucket-types';
import {Objective, ObjectiveFactor, ObjectiveId} from '@/services/data/tuples/objective-types';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {QueryObjective} from '@/services/data/tuples/query-objective-types';

export enum ObjectivesEventTypes {
	SEARCHED = 'searched',
	ASK_SEARCHED = 'ask-searched',

	CREATE_OBJECTIVE = 'create-objective',
	PICK_OBJECTIVE = 'pick-objective',

	ASK_OBJECTIVE = 'ask-objective',
	FACTOR_NAME_CHANGED = 'factor-name-changed',
	SAVE_OBJECTIVE = 'save-objective',
	OBJECTIVE_SAVED = 'objective-saved',

	ASK_ALL_BUCKETS = 'ask-all-buckets',
	ASK_BUCKETS_DETAILS = 'ask-buckets-details',
	ASK_BUCKET = 'ask-bucket'
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

	fire(type: ObjectivesEventTypes.FACTOR_NAME_CHANGED, objective: Objective, factor: ObjectiveFactor): this;
	on(type: ObjectivesEventTypes.FACTOR_NAME_CHANGED, listener: (objective: Objective, factor: ObjectiveFactor) => void): this;
	off(type: ObjectivesEventTypes.FACTOR_NAME_CHANGED, listener: (objective: Objective, factor: ObjectiveFactor) => void): this;

	fire(type: ObjectivesEventTypes.SAVE_OBJECTIVE, objective: Objective, onSaved: (objective: Objective, saved: boolean) => void): this;
	on(type: ObjectivesEventTypes.SAVE_OBJECTIVE, listener: (objective: Objective, onSaved: (objective: Objective, saved: boolean) => void) => void): this;
	off(type: ObjectivesEventTypes.SAVE_OBJECTIVE, listener: (objective: Objective, onSaved: (objective: Objective, saved: boolean) => void) => void): this;

	fire(type: ObjectivesEventTypes.OBJECTIVE_SAVED, objective: Objective): this;
	on(type: ObjectivesEventTypes.OBJECTIVE_SAVED, listener: (objective: Objective) => void): this;
	off(type: ObjectivesEventTypes.OBJECTIVE_SAVED, listener: (objective: Objective) => void): this;

	fire(type: ObjectivesEventTypes.ASK_ALL_BUCKETS, onData: (buckets: Array<QueryBucket>) => void): this;
	on(type: ObjectivesEventTypes.ASK_ALL_BUCKETS, listener: (onData: (buckets: Array<QueryBucket>) => void) => void): this;
	off(type: ObjectivesEventTypes.ASK_ALL_BUCKETS, listener: (onData: (buckets: Array<QueryBucket>) => void) => void): this;

	fire(type: ObjectivesEventTypes.ASK_BUCKETS_DETAILS, bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void): this;
	on(type: ObjectivesEventTypes.ASK_BUCKETS_DETAILS, listener: (bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void) => void): this;
	off(type: ObjectivesEventTypes.ASK_BUCKETS_DETAILS, listener: (bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void) => void): this;

	fire(type: ObjectivesEventTypes.ASK_BUCKET, bucketId: BucketId, onData: (bucket: Bucket) => void): this;
	on(type: ObjectivesEventTypes.ASK_BUCKET, listener: (bucketId: BucketId, onData: (bucket: Bucket) => void) => void): this;
	off(type: ObjectivesEventTypes.ASK_BUCKET, listener: (bucketId: BucketId, onData: (bucket: Bucket) => void) => void): this;
}