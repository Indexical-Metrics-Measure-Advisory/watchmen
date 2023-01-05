from enum import Enum
from typing import List, Dict, Optional

from pydantic import BaseModel

from watchmen_model.admin import FactorType, Topic
from watchmen_model.common import TopicId, SubjectId, DashboardId, PipelineId, PipelineStageId, PipelineUnitId, \
	PipelineActionId, FactorId, Parameter, ObjectiveFactorId, ObjectiveId
from watchmen_model.indicator import ObjectiveFactor, Objective


class LineageType(Enum):
	TOPIC = "TOPIC"
	FACTOR = "FACTOR"
	PIPELINE = "PIPELINE"
	SUBJECT = "SUBJECT"
	COLUMN = "COLUMN"
	REPORT = "REPORT"
	DASHBOARD = "DASHBOARD"
	INDICATOR = "INDICATOR"
	DERIVATIVE = "DERIVATIVE"
	OBJECTIVE = "OBJECTIVE"
	OBJECTIVE_TARGET = "OBJECTIVE_TARGET"
	OBJECTIVE_INDICATOR = "OBJECTIVE_INDICATOR"


class TypeOfAnalysis(Enum):
	Measure = "Measure"
	Dimension = "Dimension"
	TimeDimension = "TimeDimension"
	PII = "PII"
	Other = "Other"


class RelationDirection(str, Enum):
	IN = "IN"
	OUT = "OUT"


class RelationType(Enum):
	Direct = "Direct"
	Computed = "Computed"
	ReadAndWrite = "ReadAndWrite"
	ReadAndCondition = "ReadAndCondition"
	Query = "Query"
	Recalculate = "Recalculate"
	ConstantsReference = "ConstantsReference"



class RelationTypeHolders(BaseModel):
	type: RelationType = None
	arithmetic: str = None


class LineageNode(BaseModel):
	nodeId: str = None
	attributes: Dict = {}
	inCount: int = None
	outCount: int = None


# class Config:
# 	arbitrary_types_allowed = True


class LineageRelation(BaseModel):
	sourceId: str = None
	targetId: str = None
	relationType: RelationType = None
	subNode: LineageNode = None
	attributes: Dict = None
	direction: RelationDirection = None


class ReadFactorHolder(BaseModel):
	factorId: FactorId = None
	topicId: TopicId = None


class ReadTopicHolder(BaseModel):
	topicId: TopicId = None


class ReadFromMemoryHolder(BaseModel):
	parameter: Parameter


class PipelineFacet(LineageNode):
	lineageType: LineageType = LineageType.PIPELINE
	relations: List[LineageRelation] = []
	pipelineId: PipelineId = None
	stageId: PipelineStageId = None
	unitId: PipelineUnitId = None
	actionId: PipelineActionId = None
	readRowContext: Dict[str, ReadTopicHolder] = {}
	readFactorContext: Dict[str, ReadFactorHolder] = {}
	readFromMemoryContext: Dict[str, ReadFromMemoryHolder] = {}

	def get_attributes(self):
		attributes = {
			"pipelineId": self.pipelineId,
			"stageId": self.stageId,
			"unitId": self.unitId,
			"actionId": self.actionId
		}

		return attributes


class TopicFacet(LineageNode):
	lineageType: LineageType = LineageType.TOPIC
	relations: List[LineageRelation] = []


class TopicFactorFacet(LineageNode):
	parentId: TopicId = None
	nodeType: FactorType = None
	typesOfAnalysis: Optional[TypeOfAnalysis] = None
	lineageType: LineageType = LineageType.FACTOR
	relations: List[LineageRelation] = []


class DatasetColumnFacet(LineageNode):
	parentId: SubjectId = None
	typesOfAnalysis: Optional[TypeOfAnalysis] = None
	nodeType: FactorType = None
	lineageType: LineageType = LineageType.SUBJECT
	relations: List[LineageRelation] = []


class SubjectTopicHolder(BaseModel):
	topic: Topic = None


class SubjectFacet(LineageNode):
	lineageType: LineageType = LineageType.SUBJECT
	relations: List[LineageRelation] = []
	topicsHolder: Dict[str, SubjectTopicHolder] = {}

	def get_attributes(self):
		attributes = {
			"subjectId": self.nodeId
		}

		return attributes


class ReportFacet(LineageNode):
	parentId: DashboardId = None
	lineageType: LineageType = LineageType.REPORT
	relations: List[LineageRelation] = []


class DashboardFacet(LineageNode):
	lineageType: LineageType = LineageType.DASHBOARD
	relations: List[LineageRelation] = []


class IndicatorFacet(LineageNode):
	lineageType: LineageType = LineageType.INDICATOR
	relations: List[LineageRelation] = []

#
# class MetricDerivativeFacet(LineageNode):
# 	lineageType: LineageType = LineageType.DERIVATIVE
# 	relations: List[LineageRelation] = []




class ObjectiveFacet(LineageNode):
	lineageType: LineageType = LineageType.OBJECTIVE
	relations: List[LineageRelation] = []
	objectiveFactorHolders:Dict[ObjectiveFactorId,ObjectiveFactor] = {}


class ObjectiveTargetFacet(LineageNode):
	pass


class ObjectiveFactorFacet(LineageNode):
	lineageType: LineageType = LineageType.OBJECTIVE_INDICATOR
	parentId:ObjectiveId = None



