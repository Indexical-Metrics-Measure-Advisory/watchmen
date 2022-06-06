import {TuplePage} from '@/services/data/query/tuple-page';
import {Bucket, BucketId} from '@/services/data/tuples/bucket-types';
import {Indicator} from '@/services/data/tuples/indicator-types';
import {Achievement} from '@/services/data/tuples/achievement-types';
import {QueryByBucketMethod} from '@/services/data/tuples/query-bucket-types';
import {Topic, TopicId} from '@/services/data/tuples/topic-types';
import {QueryTuple} from '@/services/data/tuples/tuple-types';

export enum AchievementEventTypes {
	ACHIEVEMENT_PICKED = 'achievement-picked',
	ASK_ACHIEVEMENT = 'ask-achievement',
	ACHIEVEMENT_SEARCHED = 'achievement-searched',
	ASK_ACHIEVEMENT_QUERY_PAGE_DATA = 'ask-achievement-query-page-data',

	TO_EDIT_ACHIEVEMENT = 'to-edit-achievement',
	SWITCH_INDICATOR_CANDIDATES = 'switch-indicator_candidates',
	BACK_TO_QUERY = 'back-to-query',

	NAME_CHANGED = 'name-changed',

	SAVE_ACHIEVEMENT = 'save-achievement',
	ACHIEVEMENT_SAVED = 'achievement-saved',

	ASK_INDICATORS = 'ask-indicators',
	ASK_TOPIC = 'ask-topic',
	ASK_VALUE_BUCKETS = 'ask-value-buckets',
	ASK_MEASURE_BUCKETS = 'ask-measure-buckets'
}

export interface AchievementEventBus {
	fire(type: AchievementEventTypes.ACHIEVEMENT_PICKED, achievement: Achievement): this;
	on(type: AchievementEventTypes.ACHIEVEMENT_PICKED, listener: (achievement: Achievement) => void): this;
	off(type: AchievementEventTypes.ACHIEVEMENT_PICKED, listener: (achievement: Achievement) => void): this;

	fire(type: AchievementEventTypes.ASK_ACHIEVEMENT, onData: (achievement?: Achievement) => void): this;
	on(type: AchievementEventTypes.ASK_ACHIEVEMENT, listener: (onData: (achievement?: Achievement) => void) => void): this;
	off(type: AchievementEventTypes.ASK_ACHIEVEMENT, listener: (onData: (achievement?: Achievement) => void) => void): this;

	fire(type: AchievementEventTypes.ACHIEVEMENT_SEARCHED, page: TuplePage<QueryTuple>, searchText: string): this;
	on(type: AchievementEventTypes.ACHIEVEMENT_SEARCHED, listener: (page: TuplePage<QueryTuple>, searchText: string) => void): this;
	off(type: AchievementEventTypes.ACHIEVEMENT_SEARCHED, listener: (page: TuplePage<QueryTuple>, searchText: string) => void): this;

	fire(type: AchievementEventTypes.ASK_ACHIEVEMENT_QUERY_PAGE_DATA, onData: (page?: TuplePage<QueryTuple>, searchText?: string) => void): this;
	on(type: AchievementEventTypes.ASK_ACHIEVEMENT_QUERY_PAGE_DATA, listener: (onData: (page?: TuplePage<QueryTuple>, searchText?: string) => void) => void): this;
	off(type: AchievementEventTypes.ASK_ACHIEVEMENT_QUERY_PAGE_DATA, listener: (onData: (page?: TuplePage<QueryTuple>, searchText?: string) => void) => void): this;

	fire(type: AchievementEventTypes.TO_EDIT_ACHIEVEMENT, achievement: Achievement): this;
	on(type: AchievementEventTypes.TO_EDIT_ACHIEVEMENT, listener: (achievement: Achievement) => void): this;
	off(type: AchievementEventTypes.TO_EDIT_ACHIEVEMENT, listener: (achievement: Achievement) => void): this;

	fire(type: AchievementEventTypes.SWITCH_INDICATOR_CANDIDATES, achievement: Achievement, view: boolean): this;
	on(type: AchievementEventTypes.SWITCH_INDICATOR_CANDIDATES, listener: (achievement: Achievement, view: boolean) => void): this;
	off(type: AchievementEventTypes.SWITCH_INDICATOR_CANDIDATES, listener: (achievement: Achievement, view: boolean) => void): this;

	fire(type: AchievementEventTypes.BACK_TO_QUERY): this;
	on(type: AchievementEventTypes.BACK_TO_QUERY, listener: () => void): this;
	off(type: AchievementEventTypes.BACK_TO_QUERY, listener: () => void): this;

	fire(type: AchievementEventTypes.NAME_CHANGED, achievement: Achievement, onSaved: (achievement: Achievement, saved: boolean) => void): this;
	on(type: AchievementEventTypes.NAME_CHANGED, listener: (achievement: Achievement, onSaved: (achievement: Achievement, saved: boolean) => void) => void): this;
	off(type: AchievementEventTypes.NAME_CHANGED, listener: (achievement: Achievement, onSaved: (achievement: Achievement, saved: boolean) => void) => void): this;

	fire(type: AchievementEventTypes.SAVE_ACHIEVEMENT, achievement: Achievement, onSaved: (achievement: Achievement, saved: boolean) => void): this;
	on(type: AchievementEventTypes.SAVE_ACHIEVEMENT, listener: (achievement: Achievement, onSaved: (achievement: Achievement, saved: boolean) => void) => void): this;
	off(type: AchievementEventTypes.SAVE_ACHIEVEMENT, listener: (achievement: Achievement, onSaved: (achievement: Achievement, saved: boolean) => void) => void): this;

	fire(type: AchievementEventTypes.ACHIEVEMENT_SAVED, achievement: Achievement): this;
	on(type: AchievementEventTypes.ACHIEVEMENT_SAVED, listener: (achievement: Achievement) => void): this;
	off(type: AchievementEventTypes.ACHIEVEMENT_SAVED, listener: (achievement: Achievement) => void): this;

	fire(type: AchievementEventTypes.ASK_INDICATORS, onData: (indicators: Array<Indicator>) => void): this;
	on(type: AchievementEventTypes.ASK_INDICATORS, listener: (onData: (indicators: Array<Indicator>) => void) => void): this;
	off(type: AchievementEventTypes.ASK_INDICATORS, listener: (onData: (indicators: Array<Indicator>) => void) => void): this;

	fire(type: AchievementEventTypes.ASK_TOPIC, topicId: TopicId, onData: (topic?: Topic) => void): this;
	on(type: AchievementEventTypes.ASK_TOPIC, listener: (topicId: TopicId, onData: (topic?: Topic) => void) => void): this;
	off(type: AchievementEventTypes.ASK_TOPIC, listener: (topicId: TopicId, onData: (topic?: Topic) => void) => void): this;

	fire(type: AchievementEventTypes.ASK_VALUE_BUCKETS, bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void): this;
	on(type: AchievementEventTypes.ASK_VALUE_BUCKETS, listener: (bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void) => void): this;
	off(type: AchievementEventTypes.ASK_VALUE_BUCKETS, listener: (bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void) => void): this;

	fire(type: AchievementEventTypes.ASK_MEASURE_BUCKETS, methods: Array<QueryByBucketMethod>, onData: (buckets: Array<Bucket>) => void): this;
	on(type: AchievementEventTypes.ASK_MEASURE_BUCKETS, listener: (methods: Array<QueryByBucketMethod>, onData: (buckets: Array<Bucket>) => void) => void): this;
	off(type: AchievementEventTypes.ASK_MEASURE_BUCKETS, listener: (methods: Array<QueryByBucketMethod>, onData: (buckets: Array<Bucket>) => void) => void): this;
}