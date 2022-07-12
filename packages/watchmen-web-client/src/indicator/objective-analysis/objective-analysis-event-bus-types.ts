import {Bucket, BucketId} from '@/services/data/tuples/bucket-types';
import {Enum, EnumId} from '@/services/data/tuples/enum-types';
import {Indicator, IndicatorId} from '@/services/data/tuples/indicator-types';
import {Inspection, InspectionId} from '@/services/data/tuples/inspection-types';
import {ObjectiveAnalysis, ObjectiveAnalysisPerspective} from '@/services/data/tuples/objective-analysis-types';
import {QueryAchievement} from '@/services/data/tuples/query-achievement-types';
import {QueryBucket, QueryByBucketMethod} from '@/services/data/tuples/query-bucket-types';
import {QueryInspection} from '@/services/data/tuples/query-inspection-types';
import {Topic, TopicId} from '@/services/data/tuples/topic-types';
import {AskBucketsParams, IndicatorForInspection} from '../inspection/inspection-event-bus-types';

export enum ObjectiveAnalysisEventTypes {
	SHOW_NAVIGATOR = 'show-navigator',
	HIDE_NAVIGATOR = 'hide-navigator',

	SWITCH_TO_VIEW = 'switch-to-view',
	SWITCH_TO_EDIT = 'switch-to-edit',

	CREATED = 'create',
	DELETED = 'deleted',
	RENAMED = 'renamed',

	START_EDIT = 'start-edit',
	DELETE_PERSPECTIVE = 'delete-perspective',
	SAVE = 'save',

	ASK_ACHIEVEMENTS = 'ask-achievements',
	ASK_INSPECTIONS = 'ask-inspections',
	ASK_INSPECTION = 'ask-inspection',
	ASK_INDICATORS = 'ask-indicators',
	ASK_INDICATOR = 'ask-indicator',
	ASK_TOPIC = 'ask-topic',
	ASK_ENUM = 'ask-enum',
	ASK_QUERY_BUCKETS = 'ask-query-buckets',
	ASK_MEASURE_BUCKETS = 'ask-measure-buckets',
	ASK_VALUE_BUCKETS = 'ask-value-buckets',

	SAVE_INSPECTION = 'save-inspection'
}

export interface ObjectiveAnalysisEventBus {
	fire(type: ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR): this;
	on(type: ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR, listener: () => void): this;
	off(type: ObjectiveAnalysisEventTypes.SHOW_NAVIGATOR, listener: () => void): this;

	fire(type: ObjectiveAnalysisEventTypes.HIDE_NAVIGATOR): this;
	on(type: ObjectiveAnalysisEventTypes.HIDE_NAVIGATOR, listener: () => void): this;
	off(type: ObjectiveAnalysisEventTypes.HIDE_NAVIGATOR, listener: () => void): this;

	fire(type: ObjectiveAnalysisEventTypes.SWITCH_TO_VIEW): this;
	on(type: ObjectiveAnalysisEventTypes.SWITCH_TO_VIEW, listener: () => void): this;
	off(type: ObjectiveAnalysisEventTypes.SWITCH_TO_VIEW, listener: () => void): this;

	fire(type: ObjectiveAnalysisEventTypes.SWITCH_TO_EDIT): this;
	on(type: ObjectiveAnalysisEventTypes.SWITCH_TO_EDIT, listener: () => void): this;
	off(type: ObjectiveAnalysisEventTypes.SWITCH_TO_EDIT, listener: () => void): this;

	fire(type: ObjectiveAnalysisEventTypes.CREATED, analysis: ObjectiveAnalysis): this;
	on(type: ObjectiveAnalysisEventTypes.CREATED, listener: (analysis: ObjectiveAnalysis) => void): this;
	off(type: ObjectiveAnalysisEventTypes.CREATED, listener: (analysis: ObjectiveAnalysis) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.DELETED, analysis: ObjectiveAnalysis): this;
	on(type: ObjectiveAnalysisEventTypes.DELETED, listener: (analysis: ObjectiveAnalysis) => void): this;
	off(type: ObjectiveAnalysisEventTypes.DELETED, listener: (analysis: ObjectiveAnalysis) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.RENAMED, analysis: ObjectiveAnalysis): this;
	on(type: ObjectiveAnalysisEventTypes.RENAMED, listener: (analysis: ObjectiveAnalysis) => void): this;
	off(type: ObjectiveAnalysisEventTypes.RENAMED, listener: (analysis: ObjectiveAnalysis) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.START_EDIT, analysis: ObjectiveAnalysis): this;
	on(type: ObjectiveAnalysisEventTypes.START_EDIT, listener: (analysis: ObjectiveAnalysis) => void): this;
	off(type: ObjectiveAnalysisEventTypes.START_EDIT, listener: (analysis: ObjectiveAnalysis) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.DELETE_PERSPECTIVE, analysis: ObjectiveAnalysis, perspective: ObjectiveAnalysisPerspective): this;
	on(type: ObjectiveAnalysisEventTypes.DELETE_PERSPECTIVE, listener: (analysis: ObjectiveAnalysis, perspective: ObjectiveAnalysisPerspective) => void): this;
	off(type: ObjectiveAnalysisEventTypes.DELETE_PERSPECTIVE, listener: (analysis: ObjectiveAnalysis, perspective: ObjectiveAnalysisPerspective) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.SAVE, analysis: ObjectiveAnalysis): this;
	on(type: ObjectiveAnalysisEventTypes.SAVE, listener: (analysis: ObjectiveAnalysis) => void): this;
	off(type: ObjectiveAnalysisEventTypes.SAVE, listener: (analysis: ObjectiveAnalysis) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.ASK_ACHIEVEMENTS, onData: (achievements: Array<QueryAchievement>) => void): this;
	on(type: ObjectiveAnalysisEventTypes.ASK_ACHIEVEMENTS, listener: (onData: (achievements: Array<QueryAchievement>) => void) => void): this;
	off(type: ObjectiveAnalysisEventTypes.ASK_ACHIEVEMENTS, listener: (onData: (achievements: Array<QueryAchievement>) => void) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.ASK_INSPECTIONS, onData: (inspections: Array<QueryInspection>) => void): this;
	on(type: ObjectiveAnalysisEventTypes.ASK_INSPECTIONS, listener: (onData: (inspections: Array<QueryInspection>) => void) => void): this;
	off(type: ObjectiveAnalysisEventTypes.ASK_INSPECTIONS, listener: (onData: (inspections: Array<QueryInspection>) => void) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.ASK_INSPECTION, inspectionId: InspectionId, onData: (inspection: Inspection) => void): this;
	on(type: ObjectiveAnalysisEventTypes.ASK_INSPECTION, listener: (inspectionId: InspectionId, onData: (inspection: Inspection) => void) => void): this;
	off(type: ObjectiveAnalysisEventTypes.ASK_INSPECTION, listener: (inspectionId: InspectionId, onData: (inspection: Inspection) => void) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.ASK_INDICATORS, onData: (indicators: Array<Indicator>) => void): this;
	on(type: ObjectiveAnalysisEventTypes.ASK_INDICATORS, listener: (onData: (indicators: Array<Indicator>) => void) => void): this;
	off(type: ObjectiveAnalysisEventTypes.ASK_INDICATORS, listener: (onData: (indicators: Array<Indicator>) => void) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.ASK_INDICATOR, indicatorId: IndicatorId, onData: (indicator: IndicatorForInspection) => void): this;
	on(type: ObjectiveAnalysisEventTypes.ASK_INDICATOR, listener: (indicatorId: IndicatorId, onData: (indicator: IndicatorForInspection) => void) => void): this;
	off(type: ObjectiveAnalysisEventTypes.ASK_INDICATOR, listener: (indicatorId: IndicatorId, onData: (indicator: IndicatorForInspection) => void) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.ASK_TOPIC, topicId: TopicId, onData: (topic?: Topic) => void): this;
	on(type: ObjectiveAnalysisEventTypes.ASK_TOPIC, listener: (topicId: TopicId, onData: (topic?: Topic) => void) => void): this;
	off(type: ObjectiveAnalysisEventTypes.ASK_TOPIC, listener: (topicId: TopicId, onData: (topic?: Topic) => void) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.ASK_ENUM, enumId: EnumId, onData: (enumeration?: Enum) => void): this;
	on(type: ObjectiveAnalysisEventTypes.ASK_ENUM, listener: (enumId: EnumId, onData: (enumeration?: Enum) => void) => void): this;
	off(type: ObjectiveAnalysisEventTypes.ASK_ENUM, listener: (enumId: EnumId, onData: (enumeration?: Enum) => void) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.ASK_QUERY_BUCKETS, params: AskBucketsParams, onData: (buckets: Array<QueryBucket>) => void): this;
	on(type: ObjectiveAnalysisEventTypes.ASK_QUERY_BUCKETS, listener: (params: AskBucketsParams, onData: (buckets: Array<QueryBucket>) => void) => void): this;
	off(type: ObjectiveAnalysisEventTypes.ASK_QUERY_BUCKETS, listener: (params: AskBucketsParams, onData: (buckets: Array<QueryBucket>) => void) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.ASK_MEASURE_BUCKETS, methods: Array<QueryByBucketMethod>, onData: (buckets: Array<Bucket>) => void): this;
	on(type: ObjectiveAnalysisEventTypes.ASK_MEASURE_BUCKETS, listener: (methods: Array<QueryByBucketMethod>, onData: (buckets: Array<Bucket>) => void) => void): this;
	off(type: ObjectiveAnalysisEventTypes.ASK_MEASURE_BUCKETS, listener: (methods: Array<QueryByBucketMethod>, onData: (buckets: Array<Bucket>) => void) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.ASK_VALUE_BUCKETS, bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void): this;
	on(type: ObjectiveAnalysisEventTypes.ASK_VALUE_BUCKETS, listener: (bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void) => void): this;
	off(type: ObjectiveAnalysisEventTypes.ASK_VALUE_BUCKETS, listener: (bucketIds: Array<BucketId>, onData: (buckets: Array<Bucket>) => void) => void): this;

	fire(type: ObjectiveAnalysisEventTypes.SAVE_INSPECTION, inspection: Inspection, onSaved: (inspection: Inspection, saved: boolean) => void): this;
	on(type: ObjectiveAnalysisEventTypes.SAVE_INSPECTION, listener: (inspection: Inspection, onSaved: (inspection: Inspection, saved: boolean) => void) => void): this;
	off(type: ObjectiveAnalysisEventTypes.SAVE_INSPECTION, listener: (inspection: Inspection, onSaved: (inspection: Inspection, saved: boolean) => void) => void): this;
}
