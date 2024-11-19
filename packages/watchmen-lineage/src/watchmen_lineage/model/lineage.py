from enum import Enum
from typing import List, Dict, Optional

from watchmen_model.admin import FactorType, Topic, Factor
from watchmen_model.common import TopicId, SubjectId, DashboardId, PipelineId, PipelineStageId, PipelineUnitId, \
	PipelineActionId, FactorId, Parameter, ObjectiveFactorId, ObjectiveId
from watchmen_model.console import Subject, SubjectDataset, SubjectDatasetColumn
from watchmen_model.indicator import ObjectiveFactor, Objective, ObjectiveTarget, Indicator
from watchmen_utilities import ExtendedBaseModel


class LineageType(str, Enum):
	TOPIC = "TOPIC"
	FACTOR = "FACTOR"
	PIPELINE = "PIPELINE"
	SUBJECT = "SUBJECT"
	COLUMN = "COLUMN"
	REPORT = "REPORT"
	DASHBOARD = "DASHBOARD"
	INDICATOR = "INDICATOR"
	OBJECTIVE = "OBJECTIVE"
	OBJECTIVE_TARGET = "OBJECTIVE-TARGET"
	OBJECTIVE_INDICATOR = "OBJECTIVE-INDICATOR"


class TypeOfAnalysis(str, Enum):
	Measure = "Measure"
	Dimension = "Dimension"
	TimeDimension = "TimeDimension"
	PII = "PII"
	Other = "Other"


class RelationDirection(str, Enum):
	IN = "IN"
	OUT = "OUT"


class RelationType(str, Enum):
	Direct = "Direct"
	Computed = "Computed"
	ReadAndWrite = "ReadAndWrite"
	ReadAndCondition = "ReadAndCondition"
	Query = "Query"
	Recalculate = "Recalculate"
	ConstantsReference = "ConstantsReference"


class RelationTypeHolders(ExtendedBaseModel):
	type: Optional[RelationType] = None
	arithmetic: Optional[str] = None


class LineageNode(ExtendedBaseModel):
	name: Optional[str] = None
	nodeId: Optional[str] = None
	attributes: Optional[Dict] = {}
	inCount: Optional[int] = None
	outCount: Optional[int] = None


# class Config:
# 	arbitrary_types_allowed = True


class LineageRelation(ExtendedBaseModel):
	sourceId: Optional[str] = None
	targetId: Optional[str] = None
	relationType: Optional[RelationType] = None
	subNode: Optional[LineageNode] = None
	attributes: Optional[Dict] = None


# direction: RelationDirection = None


class ReadFactorHolder(ExtendedBaseModel):
	factorId: Optional[FactorId] = None
	topicId: Optional[TopicId] = None


class ReadTopicHolder(ExtendedBaseModel):
	topicId: Optional[TopicId] = None


class ReadFromMemoryHolder(ExtendedBaseModel):
	parameter: Optional[Parameter] = None


class PipelineFacet(LineageNode):
	lineageType: LineageType = LineageType.PIPELINE
	relations: List[LineageRelation] = []
	pipelineId: Optional[PipelineId] = None
	stageId: Optional[PipelineStageId] = None
	unitId: Optional[PipelineUnitId] = None
	actionId: Optional[PipelineActionId] = None
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
	parentId: Optional[TopicId] = None
	nodeType: Optional[FactorType] = None
	typesOfAnalysis: Optional[TypeOfAnalysis] = None
	lineageType: LineageType = LineageType.FACTOR
	relations: List[LineageRelation] = []


class DatasetColumnFacet(LineageNode):
	parentId: Optional[SubjectId] = None
	typesOfAnalysis: Optional[TypeOfAnalysis] = None
	nodeType: Optional[FactorType] = None
	lineageType: LineageType = LineageType.SUBJECT
	relations: List[LineageRelation] = []


class SubjectTopicHolder(ExtendedBaseModel):
	topic: Optional[Topic] = None


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
	parentId: Optional[DashboardId] = None
	lineageType: LineageType = LineageType.REPORT
	relations: List[LineageRelation] = []


class DashboardFacet(LineageNode):
	lineageType: LineageType = LineageType.DASHBOARD
	relations: List[LineageRelation] = []


class IndicatorFacet(LineageNode):
	lineageType: LineageType = LineageType.INDICATOR
	relations: List[LineageRelation] = []


class ObjectiveFacet(LineageNode):
	lineageType: LineageType = LineageType.OBJECTIVE
	relations: List[LineageRelation] = []
	objectiveFactorHolders: Dict[ObjectiveFactorId, ObjectiveFactor] = {}


class ObjectiveTargetFacet(LineageNode):
	lineageType: LineageType = LineageType.OBJECTIVE_TARGET
	parentId: Optional[ObjectiveId] = None
	relations: List[LineageRelation] = []


class ObjectiveFactorFacet(LineageNode):
	lineageType: LineageType = LineageType.OBJECTIVE_INDICATOR
	parentId: Optional[ObjectiveId] = None
	relations: List[LineageRelation] = []


class CidModel(ExtendedBaseModel):
	cid_: Optional[str] = None


class ObjectiveTargetLineage(ObjectiveTarget, CidModel):
	pass


class ObjectiveFactorLineage(ObjectiveFactor, CidModel):
	pass


class ObjectiveLineage(Objective):
	targets: List[ObjectiveTargetLineage] = []
	factors: List[ObjectiveFactorLineage] = []


class FactorLineage(Factor, CidModel):
	pass


class TopicLineage(Topic):
	factors: List[FactorLineage] = []


class SubjectDatasetColumnLineage(SubjectDatasetColumn, CidModel):
	pass


class SubjectDatasetLineage(SubjectDataset):
	columns: List[SubjectDatasetColumnLineage] = []


class SubjectLineage(Subject):
	dataset: Optional[SubjectDatasetLineage] = None


class IndicatorLineage(Indicator, CidModel):
	pass


# class Lineage(CidModel):
# 	type:str = None
class RelationshipLineage(CidModel):
	from_: List = []
	type: Optional[str] = None


class LineageResult(ExtendedBaseModel):
	relations: List[RelationshipLineage] = []
	objectives: List[ObjectiveLineage] = []
	topics: List[TopicLineage] = []
	subjects: List[SubjectLineage] = []
	indicators: List[IndicatorLineage] = []
	buckets: List = []
	enums: List = []
	reports: List = []
