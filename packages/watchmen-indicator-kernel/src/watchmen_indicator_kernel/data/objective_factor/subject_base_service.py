from decimal import Decimal
from enum import Enum
from typing import Optional, Tuple, List, Dict

from watchmen_auth import PrincipalService
from watchmen_model.admin import Topic, Factor
from watchmen_model.common import DataResult, ParameterJoint, ParameterJointType, SubjectId, FactorId, \
	TopicFactorParameter, TopicId, ComputedParameter, ParameterKind, ParameterComputeType, DataResultSet
from watchmen_model.console import Report, Subject, SubjectDataset, SubjectDatasetColumn, ReportDimension
from watchmen_model.console.subject import SubjectColumnArithmetic
from watchmen_model.indicator import Indicator, IndicatorAggregateArithmetic, Objective, ObjectiveFactorOnIndicator, \
	MeasureMethod
from watchmen_model.indicator.derived_objective import BreakdownTarget, BreakdownDimension, BreakdownDimensionType
from watchmen_utilities import ArrayHelper
from .data_service import ObjectiveFactorDataService
from ..utils import ask_topic, find_factor
from ..utils.enum import ask_enum
from ..utils.time_frame import TimeFrame
from ...common import IndicatorKernelException

TIME_GROUP_YEAR_OR_MONTH_COLUMN_ID: str = 'time_group_year_or_month_column'


class SubjectBaseObjectiveFactorDataService(ObjectiveFactorDataService):
	def __init__(
			self, objective: Objective, objective_factor: ObjectiveFactorOnIndicator, indicator: Indicator,
			subject: Subject,
			principal_service: PrincipalService):
		super().__init__(objective, objective_factor, indicator, principal_service)
		self.subject = subject

	def get_subject(self) -> Subject:
		return self.subject

	def ask_filter_base_id(self) -> SubjectId:
		return self.get_subject().subjectId

	def fake_time_frame_to_report(self, report: Report, time_frame: Optional[TimeFrame]):
		report_filter = self.fake_criteria_to_filter(time_frame)
		if report_filter is not None:
			report.filters = report_filter

	def fake_to_subject(self) -> Subject:
		"""
		to add indicator filter into subject, return a new subject for query purpose, only for this time.
		"""
		subject = self.get_subject()
		columns = subject.dataset.columns
		original_subject_filter = subject.dataset.filters
		if self.has_indicator_filter():
			if original_subject_filter is not None:
				subject_filter = ParameterJoint(
					jointType=ParameterJointType.AND,
					filters=[original_subject_filter, self.indicator.filter.joint]
				)
			else:
				subject_filter = self.indicator.filter.joint
		else:
			subject_filter = original_subject_filter
		return Subject(dataset=SubjectDataset(columns=columns, filters=subject_filter, joins=subject.dataset.joins))

	def fake_a_report(self, time_frame: Optional[TimeFrame]) -> Tuple[Subject, Report]:
		indicator = self.get_indicator()
		# the indicator factor, actually which is column from subject, is the indicator column of report
		report_indicator_column_id = indicator.factorId
		if report_indicator_column_id is None:
			if self.indicator.aggregateArithmetic != IndicatorAggregateArithmetic.COUNT:
				raise IndicatorKernelException(
					f'Indicator[id={indicator.indicatorId}, name={indicator.name}] column not declared, on {self.on_factor_msg()}.')
			else:
				# column not declared, and it is a count aggregation, therefore any factor should be ok
				report_indicator_column_id = self.get_subject().dataset.columns[0].columnId
		# fake report
		report = self.fake_to_report(report_indicator_column_id)
		# fake objective factor to report factor, since they are both based on subject itself
		self.fake_time_frame_to_report(report, time_frame)
		subject = self.fake_to_subject()
		return subject, report

	def ask_value(self, time_frame: Optional[TimeFrame]) -> Optional[Decimal]:
		subject, report = self.fake_a_report(time_frame)
		# merge indicator filter to subject filter
		report_data_service = self.get_report_data_service(subject, report)
		data_result = report_data_service.find()
		return self.get_value_from_result(data_result)

	def fake_time_group_year_or_month_column(
			self, topic_id: TopicId, factor_id: FactorId, name: str) -> Optional[SubjectDatasetColumn]:
		"""
		fake year or month column according to measureOnTime.
		returns column only when measure on year or month, otherwise return none.
		"""
		# fake a new column into subject
		if self.inspection.measureOnTime == MeasureMethod.YEAR:
			return SubjectDatasetColumn(
				columnId=TIME_GROUP_YEAR_OR_MONTH_COLUMN_ID,
				parameter=ComputedParameter(
					kind=ParameterKind.COMPUTED,
					type=ParameterComputeType.YEAR_OF,
					parameters=[
						TopicFactorParameter(kind=ParameterKind.TOPIC, topicId=topic_id, factorId=factor_id)
					]
				),
				alias=f'{name}_YEAR_',
				arithmetic=SubjectColumnArithmetic.NONE
			)
		elif self.inspection.measureOnTime == MeasureMethod.MONTH:
			return SubjectDatasetColumn(
				columnId=TIME_GROUP_YEAR_OR_MONTH_COLUMN_ID,
				parameter=ComputedParameter(
					kind=ParameterKind.COMPUTED,
					type=ParameterComputeType.MONTH_OF,
					parameters=[
						TopicFactorParameter(kind=ParameterKind.TOPIC, topicId=topic_id, factorId=factor_id)
					]
				),
				alias=f'{name}_MONTH_',
				arithmetic=SubjectColumnArithmetic.NONE
			)
		else:
			return None

	def find_column(self, breakdown_dimension: BreakdownDimension) -> Optional[
		SubjectDatasetColumn]:
		return ArrayHelper(self.subject.dataset.columns).find(
			lambda x: x.columnId == breakdown_dimension.factorOrColumnId)

	# def try_to_fake_time_group_column(self, breakdown_dimension: BreakdownDimension):
	# 	time_group_column = self.find_column_of_time_group_dimension(breakdown_dimension)
	# 	if time_group_column is None:
	# 		return
	# 	if not isinstance(time_group_column.parameter, TopicFactorParameter):
	# 		return
	# 	topic:Topic = ask_topic(time_group_column.parameter.topicId,self.get_principal_service())
	# 	factor:Factor = find_factor(topic, time_group_column.parameter.factorId)
	# 	# to figure out that the time group column is datetime type or not
	# 	# if it is a datetime type, must fake a new column into subject
	# 	if self.is_datetime_factor(factor):
	# 		fake_column = self.fake_time_group_year_or_month_column(
	# 			topic.topicId, factor.factorId, time_group_column.alias)
	# 		if fake_column is not None:
	# 			self.subject.dataset.columns.append(fake_column)



	def try_to_fake_value_column(self,breakdown_dimension:BreakdownDimension,index):
		column = self.find_column(breakdown_dimension)
		if column is None:
			return

		self.subject.dataset.columns.append(SubjectDatasetColumn(columnId=f'{self.FAKED_DIMENSION_ID}_{index}'
		                                                         , parameter=column.parameter
		                                                         ))


	def try_to_fake_bucket_column(self, breakdown_dimension: BreakdownDimension,index):
		measure_on_column = self.find_column(breakdown_dimension)
		if measure_on_column is None:
			return

		topic:Topic = ask_topic(measure_on_column.parameter.topicId,self.get_principal_service())
		factor:Optional[Factor] = find_factor(topic, measure_on_column.parameter.factorId)
		subject_column = self.build_bucket_dataset_column(breakdown_dimension,index,factor,topic.topicId)
		self.subject.dataset.columns.append(subject_column)

	def regenerate_breakdown_subject(self, breakdown_target: BreakdownTarget):

		for index,breakdown_dimension in enumerate(breakdown_target.dimensions):
			find_column = self.find_column(breakdown_dimension)
			if find_column is None:
				raise Exception("breakdown dimension is not found {}".format(breakdown_dimension.dimensionId))
			if breakdown_dimension.type == BreakdownDimensionType.TIME_RELATED:
				computer_column = ComputedParameter()
				computer_column.type = self.mapping_param_compute_type_to_measure_type(
					breakdown_dimension.timeMeasureMethod)

				if find_column.parameter.kind == ParameterKind.TOPIC:
					topic_parameter = TopicFactorParameter(
						kind=ParameterKind.TOPIC, topicId=find_column.parameter.topicId, factorId=find_column.parameter.factorId,
						alias=self.FAKED_DIMENSION_NAME)
				else:
					raise Exception("not support yet for time related column")

				computer_column.parameters = [topic_parameter]
				self.subject.dataset.columns.append(SubjectDatasetColumn(columnId=f'{self.FAKED_DIMENSION_ID}_{index}'
				                                            , parameter=computer_column
				                                            ))

			elif breakdown_dimension.type == BreakdownDimensionType.BUCKET:
				self.try_to_fake_bucket_column(breakdown_dimension,index)
			elif breakdown_dimension.type == BreakdownDimensionType.VALUE:
				self.try_to_fake_value_column(breakdown_dimension,index)
				pass
			else:
				raise Exception("breakdown type is not support {}".format(breakdown_dimension.type))

	def fake_to_breakdown_report(self,time_frame: Optional[TimeFrame],breakdown_target:BreakdownTarget):
		subject, report = self.fake_a_report(time_frame)
		dimensions: List[ReportDimension] = []
		def measure_to_dimension(column: SubjectDatasetColumn, index: int) -> None:
			dimensions.append(ReportDimension(columnId=column.columnId, name=f'_BUCKET_ON_{index}_'))

		ArrayHelper(subject.dataset.columns) \
			.filter(
			lambda x: x.columnId.startswith(self.FAKED_DIMENSION_ID) or x.columnId.startswith(self.MEASURE_ON_COLUMN_ID)) \
			.each_with_index(lambda x, index: measure_to_dimension(x, index + 1))

		report.dimensions = dimensions
		return subject,report



	def __find_enum_for_dimensions_in_subject(self, breakdown_target: BreakdownTarget,subject:Subject) -> Dict[int, Enum]:
		result = {}
		for index, dimension in enumerate(breakdown_target.dimensions):
			# column_id = dimension.
			self.subject = subject
			find_column = self.find_column(dimension)
			if find_column :
				if isinstance(find_column.parameter, TopicFactorParameter):
					topic_id = find_column.parameter.topicId
					factor_id = find_column.parameter.factorId
					topic = ask_topic(topic_id, self.principalService)
					factor: Factor = find_factor(topic, factor_id)
					if factor is None:
						raise Exception("factor id is not found {}".format(factor_id))
					if self.is_enum_factor(factor):
						enum: Enum = ask_enum(factor.enumId, self.principalService)
						result[index] = enum
		return result



	def ask_breakdown_values(self, time_frame: Optional[TimeFrame], breakdown_target: BreakdownTarget) -> DataResult:
		self.regenerate_breakdown_subject(breakdown_target)
		subject, report = self.fake_to_breakdown_report(time_frame,breakdown_target)
		report_data_service = self.get_report_data_service(subject, report)
		data_result =  report_data_service.find()
		enum_dict = self.__find_enum_for_dimensions_in_subject(breakdown_target,subject)
		return DataResult(
			columns=data_result.columns,
			data=self.replace_result_data_for_enum(data_result, enum_dict)
		)
