from typing import Callable, List, Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_inquiry_kernel.storage import ReportDataService
from watchmen_model.common import ComputedParameter, ConstantParameter, DataResult, DataResultSetRow, \
	ParameterComputeType, ParameterCondition, ParameterExpression, ParameterExpressionOperator, ParameterJoint, \
	ParameterJointType, ParameterKind, SubjectDatasetColumnId, TopicFactorParameter
from watchmen_model.console import Report, ReportDimension, ReportIndicator, ReportIndicatorArithmetic, Subject, \
	SubjectDatasetColumn
from watchmen_model.indicator import Indicator, IndicatorAggregateArithmetic, IndicatorCriteria, Inspection, \
	InspectMeasureOn, MeasureMethod
from watchmen_utilities import ArrayHelper, is_blank
from .inspection_data_service import InspectionDataService


def get_report_data_service(subject: Subject, report: Report, principal_service: PrincipalService) -> ReportDataService:
	return ReportDataService(subject, report, principal_service, True)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


class SubjectBaseInspectionDataService(InspectionDataService):
	def __init__(
			self, inspection: Inspection, indicator: Indicator, subject: Subject, principal_service: PrincipalService):
		super().__init__(inspection, principal_service)
		self.indicator = indicator
		self.subject = subject

	def ask_column_not_found_message(self, column_id: SubjectDatasetColumnId) -> str:
		return f'Column[id={column_id}] not found on subject[id={self.subject.subjectId}, name={self.subject.name}].'

	# noinspection DuplicatedCode
	def find_column(
			self, column_id: Optional[SubjectDatasetColumnId],
			on_factor_id_missed: Callable[[], str]) -> SubjectDatasetColumn:
		if is_blank(column_id):
			raise IndicatorKernelException(on_factor_id_missed())
		column: Optional[SubjectDatasetColumn] = ArrayHelper(self.subject.dataset.columns) \
			.find(lambda x: x.columnId == column_id)
		if column is None:
			raise IndicatorKernelException(self.ask_column_not_found_message(column_id))
		return column

	def find_column_of_measure_on_dimension(self) -> Optional[SubjectDatasetColumn]:
		measure_on = self.inspection.measureOn
		if measure_on is None or measure_on == InspectMeasureOn.NONE:
			return None
		if measure_on == InspectMeasureOn.OTHER:
			measure_on_factor_id = self.inspection.measureOnFactorId
			if is_blank(measure_on_factor_id):
				return None
			return ArrayHelper(self.subject.dataset.columns).find(lambda x: x.columnId == measure_on_factor_id)
		elif measure_on == InspectMeasureOn.VALUE:
			return ArrayHelper(self.subject.dataset.columns).find(lambda x: x.columnId == self.indicator.factorId)
		else:
			return None

	def find_column_of_measure_on_time_dimension(self) -> Optional[SubjectDatasetColumn]:
		time_group_existing, measure_on_time_factor_id, _ = self.has_time_group()
		if time_group_existing:
			return ArrayHelper(self.subject.dataset.columns).find(lambda x: x.columnId == measure_on_time_factor_id)
		else:
			return None

	# noinspection DuplicatedCode
	def fake_time_range_criteria_to_report(self) -> Optional[ParameterJoint]:
		time_range_factor_id = self.inspection.timeRangeFactorId
		if is_blank(time_range_factor_id):
			return None
		time_range_column = self.find_column(time_range_factor_id, lambda: 'Time range factor not declared.')
		time_ranges = ArrayHelper(self.inspection.timeRanges) \
			.filter(lambda x: x is not None and x.value is not None).to_list()
		if len(time_ranges) == 0:
			# no ranges given
			return None

		operator = ParameterExpressionOperator.EQUALS if len(time_ranges) == 1 else ParameterExpressionOperator.IN
		right = time_ranges[0].value if len(time_ranges) == 1 \
			else ArrayHelper(time_ranges).map(lambda x: x.value).join(',')
		time_range_measure = self.inspection.timeRangeMeasure
		if isinstance(time_range_column.parameter, TopicFactorParameter):
			topic_id = time_range_column.parameter.topicId
			if is_blank(topic_id):
				raise IndicatorKernelException(f'Topic not declared for time range factor[id={time_range_factor_id}].')
			topic = get_topic_service(self.principalService).find_by_id(topic_id)
			if topic is None:
				raise IndicatorKernelException(f'Topic[id={topic_id}] not found.')
			factor_id = time_range_column.parameter.factorId
			if is_blank(topic_id):
				raise IndicatorKernelException(f'Factor not declared for time range factor[id={time_range_factor_id}].')
			factor = ArrayHelper(topic.factors).find(lambda x: x.factorId == factor_id)
			if factor is None:
				raise IndicatorKernelException(f'Factor[id={factor_id}] not found on topic[id={topic_id}].')
			if self.has_year_or_month(factor):
				if time_range_measure == MeasureMethod.YEAR:
					compute_type = ParameterComputeType.YEAR_OF
				elif time_range_measure == MeasureMethod.MONTH:
					compute_type = ParameterComputeType.MONTH_OF
				else:
					raise IndicatorKernelException(
						f'Measure method[{time_range_measure}] for factor type[{factor.type}] is not supported.')
				joint = ParameterJoint(
					jointType=ParameterJointType.AND,
					filters=[
						ParameterExpression(
							left=ComputedParameter(
								kind=ParameterKind.COMPUTED,
								type=compute_type,
								parameters=[self.build_topic_factor_parameter('1', time_range_factor_id)]
							),
							operator=operator,
							right=ConstantParameter(kind=ParameterKind.CONSTANT, value=str(right))
						)
					]
				)
			else:
				joint = ParameterJoint(
					jointType=ParameterJointType.AND,
					filters=[
						ParameterExpression(
							left=self.build_topic_factor_parameter('1', time_range_factor_id),
							operator=operator,
							right=ConstantParameter(kind=ParameterKind.CONSTANT, value=str(right))
						)
					]
				)
		else:
			joint = ParameterJoint(
				jointType=ParameterJointType.AND,
				filters=[
					ParameterExpression(
						left=self.build_topic_factor_parameter('1', time_range_factor_id),
						operator=operator,
						right=ConstantParameter(kind=ParameterKind.CONSTANT, value=str(right))
					)
				]
			)
		return joint

	# noinspection DuplicatedCode
	def fake_criteria_to_report(self) -> Optional[ParameterJoint]:
		criteria = ArrayHelper(self.inspection.criteria).filter(lambda x: x is not None).to_list()
		if len(criteria) == 0:
			return self.fake_time_range_criteria_to_report()

		def to_condition(a_criteria: IndicatorCriteria) -> ParameterCondition:
			column = self.find_column(
				a_criteria.factorId,
				lambda: f'Column of inspection criteria[{criteria.to_dict()}] not declared.')
			return self.fake_criteria_to_condition(a_criteria)('1', column.columnId)

		return ParameterJoint(
			jointType=ParameterJointType.AND,
			filters=ArrayHelper(criteria).map(to_condition).grab(
				self.fake_time_range_criteria_to_report()).filter(lambda x: x is not None).to_list()
		)

	def fake_to_report(self) -> Report:
		indicators: List[ReportIndicator] = []
		report_indicator_column_id = self.indicator.factorId
		arithmetics = self.inspection.aggregateArithmetics
		if arithmetics is None or len(arithmetics) == 0:
			indicators.append(ReportIndicator(
				columnId=report_indicator_column_id, name='_SUM_', arithmetic=ReportIndicatorArithmetic.SUMMARY))
		else:
			if IndicatorAggregateArithmetic.COUNT in arithmetics or IndicatorAggregateArithmetic.COUNT.value in arithmetics:
				indicators.append(ReportIndicator(
					columnId=report_indicator_column_id, name='_COUNT_', arithmetic=ReportIndicatorArithmetic.COUNT))
			if IndicatorAggregateArithmetic.SUM in arithmetics or IndicatorAggregateArithmetic.SUM.value in arithmetics:
				indicators.append(ReportIndicator(
					columnId=report_indicator_column_id, name='_SUM_', arithmetic=ReportIndicatorArithmetic.SUMMARY))
			if IndicatorAggregateArithmetic.AVG in arithmetics or IndicatorAggregateArithmetic.AVG.value in arithmetics:
				indicators.append(ReportIndicator(
					columnId=report_indicator_column_id, name='_AVG_', arithmetic=ReportIndicatorArithmetic.AVERAGE))
			if IndicatorAggregateArithmetic.MAX in arithmetics or IndicatorAggregateArithmetic.MAX.value in arithmetics:
				indicators.append(ReportIndicator(
					columnId=report_indicator_column_id, name='_MAX_', arithmetic=ReportIndicatorArithmetic.MAXIMUM))
			if IndicatorAggregateArithmetic.MIN in arithmetics or IndicatorAggregateArithmetic.MIN.value in arithmetics:
				indicators.append(ReportIndicator(
					columnId=report_indicator_column_id, name='_MIN_', arithmetic=ReportIndicatorArithmetic.MINIMUM))

		dimensions: List[ReportDimension] = []
		bucket_on_column = self.find_column_of_measure_on_dimension()
		if bucket_on_column is not None:
			dimensions.append(ReportDimension(columnId=bucket_on_column.columnId, name='_BUCKET_ON_'))
		time_group_column = self.find_column_of_measure_on_time_dimension()
		if time_group_column is not None:
			fake_column = ArrayHelper(self.subject.dataset.columns) \
				.find(lambda x: x.columnId == self.FAKE_TIME_GROUP_COLUMN_ID)
			if fake_column is None:
				dimensions.append(ReportDimension(columnId=time_group_column.columnId, name='_TIME_GROUP_'))
			else:
				dimensions.append(ReportDimension(columnId=self.FAKE_TIME_GROUP_COLUMN_ID, name='_TIME_GROUP_'))
		if len(dimensions) == 0:
			raise IndicatorKernelException('Neither time group nor bucket not found.')

		report_filter = self.fake_criteria_to_report()
		if report_filter is None:
			return Report(indicators=indicators, dimensions=dimensions)
		else:
			return Report(indicators=indicators, dimensions=dimensions, filters=report_filter)

	# noinspection PyMethodMayBeStatic
	def move_indicators_to_tail(self, row: DataResultSetRow, move_count: int) -> DataResultSetRow:
		return [*row[move_count:], *row[:move_count]]

	def fake_subject(self):
		time_group_column = self.find_column_of_measure_on_time_dimension()
		# to figure out that the time group column is date type or not
		# if it is a date type, must fake a new column into subject
		if time_group_column is not None and isinstance(time_group_column.parameter, TopicFactorParameter):
			topic = get_topic_service(self.principalService).find_by_id(time_group_column.parameter.topicId)
			factor = ArrayHelper(topic.factors).find(lambda x: x.factorId == time_group_column.parameter.factorId)
			if factor is None:
				raise IndicatorKernelException('Factor of time group column not found.')
			if self.has_year_or_month(factor):
				fake_column = self.fake_time_group_column(topic.topicId, factor.factorId, time_group_column.alias)
				if fake_column is not None:
					self.subject.dataset.columns.append(fake_column)

	def find(self) -> DataResult:
		self.fake_subject()
		report = self.fake_to_report()
		report_data_service = get_report_data_service(self.subject, report, self.principalService)
		# reorder columns, move indicators to tail of row
		data_result = report_data_service.find()
		move_column_count = len(report.indicators)
		return DataResult(
			columns=data_result.columns,
			data=ArrayHelper(data_result.data).map(
				lambda x: self.move_indicators_to_tail(x, move_column_count)).to_list()
		)
