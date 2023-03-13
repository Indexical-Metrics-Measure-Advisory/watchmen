from decimal import Decimal
from typing import List, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_model.admin import Topic, Factor, FactorType, Enum
from watchmen_model.common import DataResult, ParameterJoint, ParameterJointType, ParameterKind, \
	SubjectDatasetColumnId, TopicFactorParameter, TopicId, DataResultSetRow, ComputedParameter, ParameterComputeType
from watchmen_model.console import Report, Subject, SubjectDataset, SubjectDatasetColumn, ReportDimension
from watchmen_model.indicator import Indicator, IndicatorAggregateArithmetic, Objective, ObjectiveFactorOnIndicator, \
	MeasureMethod
from watchmen_model.indicator.derived_objective import BreakdownTarget, BreakdownDimension
from watchmen_utilities import ArrayHelper
from .data_service import ObjectiveFactorDataService
from ..utils import find_factor, TimeFrame
from ..utils.enum import ask_enum

FAKED_ONLY_COLUMN_ID = 'FAKED_ONLY_COLUMN_ID'
FAKED_ONLY_COLUMN_NAME = 'faked_only_column_name'
FAKED_DIMENSION_ID = 'faked_dimension_id'
FAKED_DIMENSION_NAME = 'faked_dimension_name'


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

	def __mapping_param_compute_type_to_measure_type(self, measure_method: MeasureMethod) -> ParameterComputeType:
		if measure_method == MeasureMethod.YEAR:
			return ParameterComputeType.YEAR_OF
		elif measure_method == MeasureMethod.MONTH:
			return ParameterComputeType.MONTH_OF
		else:
			raise Exception("measure Method {} is not correct ".format(measure_method.value))

	def fake_breakdown_dimensions_to_columns(self, breakdown_dimensions: List[BreakdownDimension]) -> List[
		SubjectDatasetColumn]:
		dataset_columns: List[SubjectDatasetColumn] = []
		topic = self.get_topic()
		for index, breakdown_dim in enumerate(breakdown_dimensions):
			if breakdown_dim.timeMeasureMethod:
				computer_column = ComputedParameter()
				computer_column.type = self.__mapping_param_compute_type_to_measure_type(
					breakdown_dim.timeMeasureMethod)
				topic_parameter = TopicFactorParameter(
					kind=ParameterKind.TOPIC, topicId=topic.topicId, factorId=breakdown_dim.factorOrColumnId,
					alias=FAKED_DIMENSION_NAME)
				computer_column.parameters = [topic_parameter]
				dataset_columns.append(SubjectDatasetColumn(columnId=f'{FAKED_DIMENSION_ID}_{index}'
				                                            , parameter=computer_column
				                                            ))
			else:
				dataset_columns.append(SubjectDatasetColumn(columnId=f'{FAKED_DIMENSION_ID}_{index}'
				                                            , parameter=TopicFactorParameter(
						kind=ParameterKind.TOPIC, topicId=topic.topicId, factorId=breakdown_dim.factorOrColumnId,
						alias=FAKED_DIMENSION_NAME)
				                                            ))

		return dataset_columns

	def __fake_to_subject_for_breakdown(self, time_frame: Optional[TimeFrame], breakdown_target: BreakdownTarget):

		dataset_columns: List[SubjectDatasetColumn] = []
		indicator_factor_column, column_id = self.fake_indicator_factor_to_dataset_column()
		dataset_columns.append(indicator_factor_column)

		# TODO add breakdown BreakdownDimension
		dataset_columns.extend(self.fake_breakdown_dimensions_to_columns(breakdown_target.dimensions))

		# TODO build filter
		dataset_filters: Optional[ParameterJoint] = self.build_filters(time_frame)

		return Subject(dataset=SubjectDataset(columns=dataset_columns, filters=dataset_filters)), column_id

	def __fake_to_report_for_breakdown(self, subject: Subject, column_id: SubjectDatasetColumnId):
		report = self.fake_to_report(column_id)

		dimensions: List[ReportDimension] = []

		def measure_to_dimension(column: SubjectDatasetColumn, index: int) -> None:
			dimensions.append(ReportDimension(columnId=column.columnId, name=f'_BUCKET_ON_{index}_'))

		ArrayHelper(subject.dataset.columns) \
			.filter(lambda x: x.columnId.startswith(FAKED_DIMENSION_ID)) \
			.each_with_index(lambda x, index: measure_to_dimension(x, index + 1))

		report.dimensions = dimensions
		return report

	@staticmethod
	def move_indicators_to_tail(row: DataResultSetRow, move_count: int) -> DataResultSetRow:
		return [*row[move_count:], *row[:move_count]]

	def __is_enum_factor(self, factor: Factor):
		if factor.type == FactorType.ENUM and factor.enumId is not None:
			return True
		else:
			return False


	def __find_enum_for_dimensions(self, breakdown_target: BreakdownTarget):
		result ={}
		for index,dimension in enumerate(breakdown_target.dimensions):
			factor_id = dimension.factorOrColumnId
			topic: Topic = self.get_topic()
			factor: Factor = find_factor(topic, factor_id)
			if factor is None:
				raise Exception("factor id is not found {}".format(factor_id))
			if self.__is_enum_factor(factor):
				enum:Enum = ask_enum(factor.enumId,self.principalService)
				print(enum.items)
				result[index] = enum

		return result




	def ask_breakdown_values(self, time_frame: Optional[TimeFrame], breakdown_target: BreakdownTarget) -> DataResult:
		subject, column_id = self.__fake_to_subject_for_breakdown(time_frame, breakdown_target)
		report = self.__fake_to_report_for_breakdown(subject, column_id)
		report_data_service = self.get_report_data_service(subject, report)
		# reorder columns, move indicators to tail of row
		data_result = report_data_service.find()

		enum = self.__find_enum_for_dimensions(breakdown_target)
		print(enum.items())
		# move_column_count = len(report.indicators)
		return DataResult(
			columns=data_result.columns,
			data=data_result.data
		)
