from decimal import Decimal
from typing import List, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_model.admin import Topic
from watchmen_model.common import DataResult, ParameterJoint, ParameterJointType, ParameterKind, \
	SubjectDatasetColumnId, TopicFactorParameter, TopicId
from watchmen_model.console import Report, Subject, SubjectDataset, SubjectDatasetColumn
from watchmen_model.indicator import Indicator, IndicatorAggregateArithmetic, Objective, ObjectiveFactorOnIndicator
from .data_service import ObjectiveFactorDataService
from ..utils import find_factor, TimeFrame

FAKED_ONLY_COLUMN_ID = 'FAKED_ONLY_COLUMN_ID'
FAKED_ONLY_COLUMN_NAME = 'faked_only_column_name'


class TopicBaseObjectiveFactorDataService(ObjectiveFactorDataService):
	def __init__(
			self, objective: Objective, objective_factor: ObjectiveFactorOnIndicator, indicator: Indicator,
			topic: Topic,
			principal_service: PrincipalService):
		super().__init__(objective, objective_factor, indicator, principal_service)
		self.topic = topic

	def get_topic(self) -> Topic:
		return self.topic

	def ask_filter_base_id(self) -> TopicId:
		return self.get_topic().topicId

	def fake_indicator_factor_to_dataset_column(self) -> Tuple[SubjectDatasetColumn, SubjectDatasetColumnId]:
		indicator = self.get_indicator()
		topic = self.get_topic()
		factor = find_factor(topic, indicator.factorId)
		# factor must be declared
		if factor is None:
			if indicator.aggregateArithmetic != IndicatorAggregateArithmetic.COUNT:
				raise IndicatorKernelException(
					f'Indicator[id={indicator.indicatorId}, name={indicator.name}] factor not declared, on {self.on_factor_msg()}.')
			else:
				# factor not declared, and it is a count aggregation, therefore any factor should be ok
				factor = topic.factors[0]
		return SubjectDatasetColumn(
			columnId=FAKED_ONLY_COLUMN_ID,
			parameter=TopicFactorParameter(
				kind=ParameterKind.TOPIC, topicId=topic.topicId, factorId=factor.factorId),
			alias=FAKED_ONLY_COLUMN_NAME
		), FAKED_ONLY_COLUMN_ID

	def build_filters(self, time_frame: Optional[TimeFrame]) -> Optional[ParameterJoint]:
		a_filter = self.fake_criteria_to_filter(time_frame)
		if self.has_indicator_filter():
			if a_filter is not None:
				return ParameterJoint(
					jointType=ParameterJointType.AND,
					filters=[a_filter, self.indicator.filter.joint]
				)
			else:
				return self.indicator.filter.joint
		else:
			return a_filter

	def fake_to_subject(self, time_frame: Optional[TimeFrame]) -> Tuple[Subject, SubjectDatasetColumnId]:
		only_column, only_column_id = self.fake_indicator_factor_to_dataset_column()
		dataset_columns: List[SubjectDatasetColumn] = [only_column]
		dataset_filters: Optional[ParameterJoint] = self.build_filters(time_frame)
		return Subject(dataset=SubjectDataset(columns=dataset_columns, filters=dataset_filters)), only_column_id

	def fake_a_report(self, time_frame: Optional[TimeFrame]) -> Tuple[Subject, Report]:
		subject, only_column_id = self.fake_to_subject(time_frame)
		report = self.fake_to_report(only_column_id)
		return subject, report

	def ask_value(self, time_frame: Optional[TimeFrame]) -> Optional[Decimal]:
		subject, report = self.fake_a_report(time_frame)
		report_data_service = self.get_report_data_service(subject, report)
		data_result = report_data_service.find()
		return self.get_value_from_result(data_result)

	def ask_breakdown_values(self, time_frame: Optional[TimeFrame]) -> DataResult:
		subject, report = self.fake_a_report(time_frame)
		# TODO ADD GROUPING COLUMNS
		report_data_service = self.get_report_data_service(subject, report)
		return report_data_service.find()
