import {Bucket} from './bucket-types';
import {Enum} from './enum-types';
import {Factor} from './factor-types';
import {Indicator} from './indicator-types';
import {Objective, ObjectiveFactor, ObjectiveTarget} from './objective-types';
import {Report, ReportDimension, ReportIndicator} from './report-types';
import {Subject, SubjectDataSetColumn} from './subject-types';
import {Topic} from './topic-types';

export type ConsanguinityUniqueId = string;
export type ConsanguinityMentionable = { '@cid': ConsanguinityUniqueId }

export type ConsanguinityTopicFactor =
	ConsanguinityMentionable
	& Pick<Factor, 'factorId' | 'type' | 'name' | 'label' | 'enumId' | 'description'>;

export type ConsanguinityTopic =
	Pick<Topic, 'topicId' | 'name' | 'kind' | 'type' | 'description'>
	& { factors: Array<ConsanguinityTopicFactor> }

export type ConsanguinitySubjectColumn =
	ConsanguinityMentionable
	& Pick<SubjectDataSetColumn, 'columnId' | 'alias' | 'arithmetic' | 'recalculate'>

export type ConsanguinitySubject =
	Pick<Subject, 'subjectId' | 'name'>
	& { columns: Array<ConsanguinitySubjectColumn> }

export type ConsanguinityReportIndicator = ConsanguinityMentionable & ReportIndicator
export type ConsanguinityReportDimension = ConsanguinityMentionable & ReportDimension
export type ConsanguinityReport =
	Pick<Report, 'reportId' | 'name' | 'description'>
	& { indicators: Array<ConsanguinityReportIndicator> }
	& { dimensions: Array<ConsanguinityReportDimension> }

export type ConsanguinityIndicator =
	ConsanguinityMentionable
	& Pick<Indicator, 'indicatorId' | 'name' | 'aggregateArithmetic' | 'description'>

export type ConsanguinityObjectiveTarget = ConsanguinityMentionable & Pick<ObjectiveTarget, 'uuid' | 'name'>
export type ConsanguinityObjectiveFactor = ConsanguinityMentionable & Pick<ObjectiveFactor, 'uuid' | 'name' | 'kind'>
export type ConsanguinityObjective =
	Pick<Objective, 'objectiveId' | 'name' | 'description'>
	& { targets: Array<ConsanguinityObjectiveTarget> }
	& { factors: Array<ConsanguinityObjectiveFactor> }

export type ConsanguinityBucket =
	ConsanguinityMentionable &
	Pick<Bucket, 'bucketId' | 'name' | 'type' | 'description'>

export type ConsanguinityEnum =
	ConsanguinityMentionable &
	Pick<Enum, 'enumId' | 'name' | 'description'>

export enum ConsanguinityLineType {
	OBJECTIVE_FACTOR_TO_TARGET__REFER = 'refer',
	OBJECTIVE_FACTOR_TO_TARGET__COMPUTE = 'compute',
	OBJECTIVE_FACTOR_TO_FACTOR__COMPUTE = 'compute',
	INDICATOR_TO_OBJECTIVE_FACTOR = 'refer',
	TOPIC_FACTOR_TO_INDICATOR__REFER = 'refer',
	SUBJECT_COLUMN_TO_INDICATOR__REFER = 'refer',
	BUCKET_TO_INDICATOR__WEAK_REFER = 'weak-refer',
	TOPIC_FACTOR_TO_SUBJECT_COLUMN__REFER = 'refer',
	TOPIC_FACTOR_TO_SUBJECT_COLUMN__COMPUTE = 'compute',
	SUBJECT_COLUMN_TO_SUBJECT_COLUMN__COMPUTE = 'compute',
	TOPIC_FACTOR_TO_TOPIC_FACTOR__COPY = 'copy'
}

export type ConsanguinityLine<T extends ConsanguinityLineType> = { '@cid': ConsanguinityUniqueId, type: T }
export type ConsanguinityRelationship<F extends ConsanguinityLine<ConsanguinityLineType>> = {
	'@cid': ConsanguinityUniqueId,
	from: Array<F>
}
// objective factor -> objective target
export type ConsanguinityLineFromObjectiveFactorToObjectiveTarget =
	ConsanguinityLine<ConsanguinityLineType.OBJECTIVE_FACTOR_TO_TARGET__REFER | ConsanguinityLineType.OBJECTIVE_FACTOR_TO_TARGET__COMPUTE>
export type ConsanguinityObjectiveTargetRelationship = ConsanguinityRelationship<ConsanguinityLineFromObjectiveFactorToObjectiveTarget>
// indicator -> objective factor
// objective factor -> objective factor
export type ConsanguinityLineFromObjectiveFactorToObjectiveFactor = ConsanguinityLine<ConsanguinityLineType.OBJECTIVE_FACTOR_TO_FACTOR__COMPUTE>
export type ConsanguinityLineFromIndicatorToObjectiveFactor = ConsanguinityLine<ConsanguinityLineType.INDICATOR_TO_OBJECTIVE_FACTOR>
export type ConsanguinityObjectiveFactorRelationship =
	ConsanguinityRelationship<ConsanguinityLineFromObjectiveFactorToObjectiveFactor | ConsanguinityLineFromIndicatorToObjectiveFactor>
// topic/factor -> indicator
// subject/column -> indicator
// bucket -> indicator
export type ConsanguinityLineFromTopicFactorToIndicator = ConsanguinityLine<ConsanguinityLineType.TOPIC_FACTOR_TO_INDICATOR__REFER>
export type ConsanguinityLineFromSubjectColumnToIndicator = ConsanguinityLine<ConsanguinityLineType.SUBJECT_COLUMN_TO_INDICATOR__REFER>
export type ConsanguinityLineFromBucketToIndicator = ConsanguinityLine<ConsanguinityLineType.BUCKET_TO_INDICATOR__WEAK_REFER>
export type ConsanguinityIndicatorRelationship =
	ConsanguinityRelationship<ConsanguinityLineFromTopicFactorToIndicator | ConsanguinityLineFromSubjectColumnToIndicator | ConsanguinityLineFromBucketToIndicator>
// topic/factor -> subject/column
// subject/column -> subject/column (recalculate)
export type ConsanguinityLineFromTopicFactorToSubjectColumn =
	ConsanguinityLine<ConsanguinityLineType.TOPIC_FACTOR_TO_SUBJECT_COLUMN__REFER | ConsanguinityLineType.TOPIC_FACTOR_TO_SUBJECT_COLUMN__COMPUTE>
export type ConsanguinityLineFromSubjectColumnToSubjectColumn = ConsanguinityLine<ConsanguinityLineType.SUBJECT_COLUMN_TO_SUBJECT_COLUMN__COMPUTE>
export type ConsanguinitySubjectColumnRelationship =
	ConsanguinityRelationship<ConsanguinityLineFromTopicFactorToSubjectColumn | ConsanguinityLineFromSubjectColumnToSubjectColumn>
// topic/factor -> topic/factor
export type ConsanguinityLineFromTopicFactorToTopicFactor = ConsanguinityLine<ConsanguinityLineType.TOPIC_FACTOR_TO_TOPIC_FACTOR__COPY>
export type ConsanguinityTopicFactorRelationship = ConsanguinityRelationship<ConsanguinityLineFromTopicFactorToTopicFactor>

export interface Consanguinity {
	relations?: Array<
		ConsanguinityObjectiveTargetRelationship | ConsanguinityObjectiveFactorRelationship
		| ConsanguinityIndicatorRelationship
		| ConsanguinitySubjectColumnRelationship
		| ConsanguinityTopicFactorRelationship
	>;
	topics?: Array<ConsanguinityTopic>;
	subjects?: Array<ConsanguinitySubject>;
	reports?: Array<ConsanguinityReport>;
	indicators?: Array<ConsanguinityIndicator>;
	objectives?: Array<ConsanguinityObjective>;
	buckets?: Array<ConsanguinityBucket>;
	enums?: Array<ConsanguinityEnum>;
}
