import {
	ConsanguinityIndicator,
	ConsanguinityLineType,
	ConsanguinityObjective,
	ConsanguinityObjectiveFactor,
	ConsanguinityObjectiveTarget,
	ConsanguinitySubject,
	ConsanguinitySubjectColumn,
	ConsanguinityTopic,
	ConsanguinityTopicFactor,
	ConsanguinityUniqueId
} from '@/services/data/tuples/consanguinity-types';

export type DiagramObjectiveTarget = ConsanguinityObjectiveTarget & { objective: ConsanguinityObjective };
export type DiagramObjectiveTargetList = Array<DiagramObjectiveTarget>;
export type DiagramObjectiveTargetMap = Record<ConsanguinityUniqueId, DiagramObjectiveTarget>;

export type DiagramObjectiveFactor = ConsanguinityObjectiveFactor & { objective: ConsanguinityObjective };
export type DiagramObjectiveFactorList = Array<DiagramObjectiveFactor>;
export type DiagramObjectiveFactorMap = Record<ConsanguinityUniqueId, DiagramObjectiveFactor>;

export type DiagramIndicator = ConsanguinityIndicator;
export type DiagramIndicatorList = Array<DiagramIndicator>;
export type DiagramIndicatorMap = Record<ConsanguinityUniqueId, DiagramIndicator>;

export type DiagramSubjectColumn = ConsanguinitySubjectColumn & { subject: ConsanguinitySubject };
export type DiagramSubjectColumnMap = Record<ConsanguinityUniqueId, DiagramSubjectColumn>;
export type DiagramSubject = Omit<ConsanguinitySubject, 'columns'> & { columns: Array<DiagramSubjectColumn> };
export type DiagramSubjectList = Array<DiagramSubject>;

export type DiagramTopicFactor = ConsanguinityTopicFactor & { topic: ConsanguinityTopic };
export type DiagramTopicFactorMap = Record<ConsanguinityUniqueId, DiagramTopicFactor>;
export type DiagramTopic = Omit<ConsanguinityTopic, 'factors'> & { factors: Array<DiagramTopicFactor> };
export type DiagramTopicList = Array<DiagramTopic>;

export type DiagramDataMap = {
	targets: DiagramObjectiveTargetMap;
	factors: DiagramObjectiveFactorMap;
	indicators: DiagramIndicatorMap;
	subjectColumns: DiagramSubjectColumnMap;
	topicFactors: DiagramTopicFactorMap;
}

export type DiagramRelation = {
	from: ConsanguinityUniqueId,
	to: ConsanguinityUniqueId,
	type: ConsanguinityLineType
}