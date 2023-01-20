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
} from '@/services/data/tuples/consanguinity';

export type DiagramObjectiveTarget = ConsanguinityObjectiveTarget & { objective: ConsanguinityObjective };
export type DiagramObjectiveTargetList = Array<DiagramObjectiveTarget>
export type DiagramObjectiveTargetMap = Record<ConsanguinityUniqueId, DiagramObjectiveTarget>;

export type DiagramObjectiveFactor = ConsanguinityObjectiveFactor & { objective: ConsanguinityObjective };
export type DiagramObjectiveFactorList = Array<DiagramObjectiveFactor>
export type DiagramObjectiveFactorMap = Record<ConsanguinityUniqueId, DiagramObjectiveFactor>;

export type DiagramIndicator = ConsanguinityIndicator;
export type DiagramIndicatorList = Array<DiagramIndicator>
export type DiagramIndicatorMap = Record<ConsanguinityUniqueId, DiagramIndicator>;

export type DiagramSubjectColumn = ConsanguinitySubjectColumn & { subject: ConsanguinitySubject }
export type DiagramSubjectColumnMap = Record<ConsanguinityUniqueId, DiagramSubjectColumn>;
export type DiagramSubject = ConsanguinitySubject;
export type DiagramSubjectList = Array<DiagramSubject>

export type DiagramTopicFactor = ConsanguinityTopicFactor & { topic: ConsanguinityTopic }
export type DiagramTopicFactorMap = Record<ConsanguinityUniqueId, DiagramTopicFactor>;
export type DiagramTopic = ConsanguinityTopic;
export type DiagramTopicList = Array<DiagramTopic>

export type DiagramRelations = {
	from: ConsanguinityUniqueId,
	to: ConsanguinityUniqueId,
	type: ConsanguinityLineType
}