import {TuplePage} from '@/services/data/query/tuple-page';
import {Bucket, BucketId} from '@/services/data/tuples/bucket-types';
import {ConvergenceVariable} from '@/services/data/tuples/convergence-types';
import {Objective, ObjectiveId} from '@/services/data/tuples/objective-types';
import {QueryBucket} from '@/services/data/tuples/query-bucket-types';
import {QueryObjective} from '@/services/data/tuples/query-objective-types';
import {QueryUserGroupForHolder} from '@/services/data/tuples/query-user-group-types';
import {DataStory, StoryId} from "@/services/data/tuples/story-types";
import {QueryStory} from "@/services/data/tuples/query-story-types";

export enum StoryEventTypes {
	SEARCHED = 'searched',
	ASK_SEARCHED = 'ask-searched',

	CREATE_STORY = 'create-story',
	PICK_STORY = 'pick-story',

	DELETE_VARIABLE = 'delete-variable',

	ASK_STORY = 'ask-story',
	SAVE_STORY = 'save-story',
	STORY_SAVED = 'story-saved',

	ASK_ALL_BUCKETS = 'ask-all-buckets',
	ASK_BUCKETS = 'ask-buckets-details',
	ASK_BUCKET = 'ask-bucket',

	ASK_ALL_OBJECTIVES = 'ask-all-objectives',
	ASK_OBJECTIVES = 'ask-objectives',
	ASK_OBJECTIVE = 'ask-objective',

	ASK_ALL_USER_GROUPS = 'ask-all-user-groups'
}

export interface StoryEventBus {
	fire(type: StoryEventTypes.SEARCHED, page: TuplePage<QueryStory>, searchText: string): this;
	on(type: StoryEventTypes.SEARCHED, listener: (page: TuplePage<QueryStory>, searchText: string) => void): this;
	off(type: StoryEventTypes.SEARCHED, listener: (page: TuplePage<QueryStory>, searchText: string) => void): this;

	fire(type: StoryEventTypes.ASK_SEARCHED, onData: (page?: TuplePage<QueryStory>, searchText?: string) => void): this;
	on(type: StoryEventTypes.ASK_SEARCHED, listener: (onData: (page?: TuplePage<QueryStory>, searchText?: string) => void) => void): this;
	off(type: StoryEventTypes.ASK_SEARCHED, listener: (onData: (page?: TuplePage<QueryStory>, searchText?: string) => void) => void): this;

	fire(type: StoryEventTypes.CREATE_STORY, onCreated: (story: DataStory) => void): this;
	on(type: StoryEventTypes.CREATE_STORY, listener: (onCreated: (story: DataStory) => void) => void): this;
	off(type: StoryEventTypes.CREATE_STORY, listener: (onCreated: (story: DataStory) => void) => void): this;

	fire(type: StoryEventTypes.PICK_STORY, storyId: StoryId, onData: (story: DataStory) => void): this;
	on(type: StoryEventTypes.PICK_STORY, listener: (storyId: StoryId, onData: (story: DataStory) => void) => void): this;
	off(type: StoryEventTypes.PICK_STORY, listener: (storyId: StoryId, onData: (story: DataStory) => void) => void): this;

	fire(type: StoryEventTypes.DELETE_VARIABLE, story: DataStory, variable: ConvergenceVariable): this;
	on(type: StoryEventTypes.DELETE_VARIABLE, listener: (story: DataStory, variable: ConvergenceVariable) => void): this;
	off(type: StoryEventTypes.DELETE_VARIABLE, listener: (story: DataStory, variable: ConvergenceVariable) => void): this;

	fire(type: StoryEventTypes.ASK_STORY, onData: (story?: DataStory) => void): this;
	on(type: StoryEventTypes.ASK_STORY, listener: (onData: (story?: DataStory) => void) => void): this;
	off(type: StoryEventTypes.ASK_STORY, listener: (onData: (story?: DataStory) => void) => void): this;

	fire(type: StoryEventTypes.SAVE_STORY, story: DataStory, onSaved: (story: DataStory, saved: boolean) => void, immediately?: boolean): this;
	on(type: StoryEventTypes.SAVE_STORY, listener: (story: DataStory, onSaved: (story: DataStory, saved: boolean) => void, immediately?: boolean) => void): this;
	off(type: StoryEventTypes.SAVE_STORY, listener: (story: DataStory, onSaved: (story: DataStory, saved: boolean) => void, immediately?: boolean) => void): this;

	fire(type: StoryEventTypes.STORY_SAVED, story: DataStory): this;
	on(type: StoryEventTypes.STORY_SAVED, listener: (story: DataStory) => void): this;
	off(type: StoryEventTypes.STORY_SAVED, listener: (story: DataStory) => void): this;

	fire(type: StoryEventTypes.ASK_ALL_BUCKETS, onData: (buckets: Array<QueryBucket>) => void): this;
	on(type: StoryEventTypes.ASK_ALL_BUCKETS, listener: (onData: (buckets: Array<QueryBucket>) => void) => void): this;
	off(type: StoryEventTypes.ASK_ALL_BUCKETS, listener: (onData: (buckets: Array<QueryBucket>) => void) => void): this;

	fire(type: StoryEventTypes.ASK_BUCKETS, bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void): this;
	on(type: StoryEventTypes.ASK_BUCKETS, listener: (bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void) => void): this;
	off(type: StoryEventTypes.ASK_BUCKETS, listener: (bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void) => void): this;

	fire(type: StoryEventTypes.ASK_BUCKET, bucketId: BucketId, onData: (bucket?: Bucket) => void): this;
	on(type: StoryEventTypes.ASK_BUCKET, listener: (bucketId: BucketId, onData: (bucket?: Bucket) => void) => void): this;
	off(type: StoryEventTypes.ASK_BUCKET, listener: (bucketId: BucketId, onData: (bucket?: Bucket) => void) => void): this;

	fire(type: StoryEventTypes.ASK_ALL_OBJECTIVES, onData: (objectives: Array<QueryObjective>) => void): this;
	on(type: StoryEventTypes.ASK_ALL_OBJECTIVES, listener: (onData: (objectives: Array<QueryObjective>) => void) => void): this;
	off(type: StoryEventTypes.ASK_ALL_OBJECTIVES, listener: (onData: (objectives: Array<QueryObjective>) => void) => void): this;

	fire(type: StoryEventTypes.ASK_OBJECTIVES, objectiveIds: Array<ObjectiveId>, onData: (objectives: Array<Objective>) => void): this;
	on(type: StoryEventTypes.ASK_OBJECTIVES, listener: (objectiveIds: Array<ObjectiveId>, onData: (objectives: Array<Objective>) => void) => void): this;
	off(type: StoryEventTypes.ASK_OBJECTIVES, listener: (objectiveIds: Array<ObjectiveId>, onData: (objectives: Array<Objective>) => void) => void): this;

	fire(type: StoryEventTypes.ASK_OBJECTIVE, objectiveId: ObjectiveId, onData: (objective?: Objective) => void): this;
	on(type: StoryEventTypes.ASK_OBJECTIVE, listener: (objectiveId: ObjectiveId, onData: (objective?: Objective) => void) => void): this;
	off(type: StoryEventTypes.ASK_OBJECTIVE, listener: (objectiveId: ObjectiveId, onData: (objective?: Objective) => void) => void): this;

	fire(type: StoryEventTypes.ASK_ALL_USER_GROUPS, onData: (groups: Array<QueryUserGroupForHolder>) => void): this;
	on(type: StoryEventTypes.ASK_ALL_USER_GROUPS, listener: (onData: (groups: Array<QueryUserGroupForHolder>) => void) => void): this;
	off(type: StoryEventTypes.ASK_ALL_USER_GROUPS, listener: (onData: (groups: Array<QueryUserGroupForHolder>) => void) => void): this;
}