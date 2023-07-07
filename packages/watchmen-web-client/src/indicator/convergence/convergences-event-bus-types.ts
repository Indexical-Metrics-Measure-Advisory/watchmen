import {TuplePage} from '@/services/data/query/tuple-page';
import {Bucket, BucketId} from '@/services/data/tuples/bucket-types';
import {Convergence, ConvergenceId, ConvergenceVariable} from '@/services/data/tuples/convergence-types';
import {Objective, ObjectiveId} from '@/services/data/tuples/objective-types';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {QueryConvergence} from '@/services/data/tuples/query-convergence-types';
import {QueryUserGroupForHolder} from '@/services/data/tuples/query-user-group-types';

export enum ConvergencesEventTypes {
	SEARCHED = 'searched',
	ASK_SEARCHED = 'ask-searched',

	CREATE_CONVERGENCE = 'create-convergence',
	PICK_CONVERGENCE = 'pick-convergence',

	DELETE_VARIABLE = 'delete-variable',

	ASK_CONVERGENCE = 'ask-convergence',
	SAVE_CONVERGENCE = 'save-convergence',
	CONVERGENCE_SAVED = 'convergence-saved',

	ASK_ALL_BUCKETS = 'ask-all-buckets',
	ASK_BUCKETS = 'ask-buckets-details',
	ASK_BUCKET = 'ask-bucket',

	ASK_OBJECTIVES = 'ask-objectives',

	ASK_ALL_USER_GROUPS = 'ask-all-user-groups'
}

export interface ConvergencesEventBus {
	fire(type: ConvergencesEventTypes.SEARCHED, page: TuplePage<QueryConvergence>, searchText: string): this;
	on(type: ConvergencesEventTypes.SEARCHED, listener: (page: TuplePage<QueryConvergence>, searchText: string) => void): this;
	off(type: ConvergencesEventTypes.SEARCHED, listener: (page: TuplePage<QueryConvergence>, searchText: string) => void): this;

	fire(type: ConvergencesEventTypes.ASK_SEARCHED, onData: (page?: TuplePage<QueryConvergence>, searchText?: string) => void): this;
	on(type: ConvergencesEventTypes.ASK_SEARCHED, listener: (onData: (page?: TuplePage<QueryConvergence>, searchText?: string) => void) => void): this;
	off(type: ConvergencesEventTypes.ASK_SEARCHED, listener: (onData: (page?: TuplePage<QueryConvergence>, searchText?: string) => void) => void): this;

	fire(type: ConvergencesEventTypes.CREATE_CONVERGENCE, onCreated: (convergence: Convergence) => void): this;
	on(type: ConvergencesEventTypes.CREATE_CONVERGENCE, listener: (onCreated: (convergence: Convergence) => void) => void): this;
	off(type: ConvergencesEventTypes.CREATE_CONVERGENCE, listener: (onCreated: (convergence: Convergence) => void) => void): this;

	fire(type: ConvergencesEventTypes.PICK_CONVERGENCE, convergenceId: ConvergenceId, onData: (convergence: Convergence) => void): this;
	on(type: ConvergencesEventTypes.PICK_CONVERGENCE, listener: (convergenceId: ConvergenceId, onData: (convergence: Convergence) => void) => void): this;
	off(type: ConvergencesEventTypes.PICK_CONVERGENCE, listener: (convergenceId: ConvergenceId, onData: (convergence: Convergence) => void) => void): this;

	fire(type: ConvergencesEventTypes.DELETE_VARIABLE, convergence: Convergence, variable: ConvergenceVariable): this;
	on(type: ConvergencesEventTypes.DELETE_VARIABLE, listener: (convergence: Convergence, variable: ConvergenceVariable) => void): this;
	off(type: ConvergencesEventTypes.DELETE_VARIABLE, listener: (convergence: Convergence, variable: ConvergenceVariable) => void): this;

	fire(type: ConvergencesEventTypes.ASK_CONVERGENCE, onData: (convergence?: Convergence) => void): this;
	on(type: ConvergencesEventTypes.ASK_CONVERGENCE, listener: (onData: (convergence?: Convergence) => void) => void): this;
	off(type: ConvergencesEventTypes.ASK_CONVERGENCE, listener: (onData: (convergence?: Convergence) => void) => void): this;

	fire(type: ConvergencesEventTypes.SAVE_CONVERGENCE, convergence: Convergence, onSaved: (convergence: Convergence, saved: boolean) => void, immediately?: boolean): this;
	on(type: ConvergencesEventTypes.SAVE_CONVERGENCE, listener: (convergence: Convergence, onSaved: (convergence: Convergence, saved: boolean) => void, immediately?: boolean) => void): this;
	off(type: ConvergencesEventTypes.SAVE_CONVERGENCE, listener: (convergence: Convergence, onSaved: (convergence: Convergence, saved: boolean) => void, immediately?: boolean) => void): this;

	fire(type: ConvergencesEventTypes.CONVERGENCE_SAVED, convergence: Convergence): this;
	on(type: ConvergencesEventTypes.CONVERGENCE_SAVED, listener: (convergence: Convergence) => void): this;
	off(type: ConvergencesEventTypes.CONVERGENCE_SAVED, listener: (convergence: Convergence) => void): this;

	fire(type: ConvergencesEventTypes.ASK_ALL_BUCKETS, onData: (buckets: Array<QueryBucket>) => void): this;
	on(type: ConvergencesEventTypes.ASK_ALL_BUCKETS, listener: (onData: (buckets: Array<QueryBucket>) => void) => void): this;
	off(type: ConvergencesEventTypes.ASK_ALL_BUCKETS, listener: (onData: (buckets: Array<QueryBucket>) => void) => void): this;

	fire(type: ConvergencesEventTypes.ASK_BUCKETS, bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void): this;
	on(type: ConvergencesEventTypes.ASK_BUCKETS, listener: (bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void) => void): this;
	off(type: ConvergencesEventTypes.ASK_BUCKETS, listener: (bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void) => void): this;

	fire(type: ConvergencesEventTypes.ASK_BUCKET, bucketId: BucketId, onData: (bucket?: Bucket) => void): this;
	on(type: ConvergencesEventTypes.ASK_BUCKET, listener: (bucketId: BucketId, onData: (bucket?: Bucket) => void) => void): this;
	off(type: ConvergencesEventTypes.ASK_BUCKET, listener: (bucketId: BucketId, onData: (bucket?: Bucket) => void) => void): this;

	fire(type: ConvergencesEventTypes.ASK_OBJECTIVES, objectiveIds: Array<ObjectiveId>, onData: (objectives: Array<Objective>) => void): this;
	on(type: ConvergencesEventTypes.ASK_OBJECTIVES, listener: (objectiveIds: Array<ObjectiveId>, onData: (objectives: Array<Objective>) => void) => void): this;
	off(type: ConvergencesEventTypes.ASK_OBJECTIVES, listener: (objectiveIds: Array<ObjectiveId>, onData: (objectives: Array<Objective>) => void) => void): this;

	fire(type: ConvergencesEventTypes.ASK_ALL_USER_GROUPS, onData: (groups: Array<QueryUserGroupForHolder>) => void): this;
	on(type: ConvergencesEventTypes.ASK_ALL_USER_GROUPS, listener: (onData: (groups: Array<QueryUserGroupForHolder>) => void) => void): this;
	off(type: ConvergencesEventTypes.ASK_ALL_USER_GROUPS, listener: (onData: (groups: Array<QueryUserGroupForHolder>) => void) => void): this;
}