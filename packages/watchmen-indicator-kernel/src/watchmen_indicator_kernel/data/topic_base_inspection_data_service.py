from typing import Callable, List, Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_inquiry_kernel.storage import ReportDataService
from watchmen_model.admin import Factor, Topic
from watchmen_model.common import ComputedParameter, ConstantParameter, DataResult, DataResultSetRow, \
	FactorId, Parameter, ParameterComputeType, ParameterCondition, ParameterExpression, ParameterExpressionOperator, \
	ParameterJoint, ParameterJointType, ParameterKind, TopicFactorParameter, TopicId
from watchmen_model.console import Report, ReportDimension, ReportIndicator, Subject, SubjectDataset, \
	SubjectDatasetColumn
from watchmen_model.indicator import Bucket, CategorySegment, CategorySegmentsHolder, Indicator, IndicatorCriteria, \
	Inspection, InspectMeasureOn, InspectMeasureOnType, MeasureMethod, NumericSegmentsHolder, NumericValueSegment, \
	OtherCategorySegmentValue, RangeBucketValueIncluding
from watchmen_utilities import ArrayHelper, is_blank
from .bucket_helper import ask_bucket
from .inspection_data_service import InspectionDataService


def get_report_data_service(subject: Subject, report: Report, principal_service: PrincipalService) -> ReportDataService:
	return ReportDataService(subject, report, principal_service, True)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


class TopicBaseInspectionDataService(InspectionDataService):
	def __init__(self, inspection: Inspection, indicator: Indicator, topic: Topic, principal_service: PrincipalService):
		super().__init__(inspection, principal_service)
		self.indicator = indicator
		self.topic = topic
		self.INDICATOR_FACTOR_COLUMN_ID: str = 'indicator_factor_column'
		self.TIME_GROUP_COLUMN_ID: str = 'time_group_column'
		self.MEASURE_ON_COLUMN_ID: str = 'measure_on_column'

	def ask_factor_not_found_message(self, factor_id: FactorId) -> str:
		return f'Factor[id={factor_id}] not found on topic[id={self.topic.topicId}, name={self.topic.name}].'

	# noinspection DuplicatedCode
	def find_factor(
			self, factor_id: Optional[FactorId],
			on_factor_id_missed: Callable[[], str]) -> Factor:
		if is_blank(factor_id):
			raise IndicatorKernelException(on_factor_id_missed())
		factor: Optional[Factor] = ArrayHelper(self.topic.factors).find(lambda x: x.factorId == factor_id)
		if factor is None:
			raise IndicatorKernelException(self.ask_factor_not_found_message(factor_id))
		return factor

	def fake_indicator_factor_to_dataset_column(self) -> SubjectDatasetColumn:
		"""
		fake a dataset column based on indicator factor
		"""
		indicator_factor = self.find_factor(
			self.indicator.factorId,
			lambda: f'Indicator[id={self.indicator.indicatorId}, name={self.indicator.name}] factor not declared.')
		return SubjectDatasetColumn(
			columnId=self.INDICATOR_FACTOR_COLUMN_ID,
			parameter=TopicFactorParameter(
				kind=ParameterKind.TOPIC, topicId=self.topic.topicId, factorId=indicator_factor.factorId),
			alias=f'column_{self.INDICATOR_FACTOR_COLUMN_ID}'
		)

	def fake_time_group_to_dataset_column(self) -> Optional[SubjectDatasetColumn]:
		"""
		fake time group column based on time group.
		returns yearOf/monthOf when original time group factor is datetime,
		otherwise use the original factor
		"""
		time_group_existing, measure_on_time_factor_id, measure_on_time = self.has_time_group()
		if not time_group_existing:
			return None

		measure_on_time_factor = self.find_factor(
			measure_on_time_factor_id, lambda: 'Measure on time factor not declared.')
		if self.is_datetime_factor(measure_on_time_factor.type):
			if measure_on_time == MeasureMethod.YEAR:
				compute_type = ParameterComputeType.YEAR_OF
			elif measure_on_time == MeasureMethod.MONTH:
				compute_type = ParameterComputeType.MONTH_OF
			else:
				raise IndicatorKernelException(
					f'Measure method[{measure_on_time}] for factor type[{measure_on_time_factor.type}] is not supported.')
			return SubjectDatasetColumn(
				columnId=self.TIME_GROUP_COLUMN_ID,
				parameter=ComputedParameter(
					kind=ParameterKind.COMPUTED,
					type=compute_type,
					parameters=[
						TopicFactorParameter(
							kind=ParameterKind.TOPIC,
							topicId=self.topic.topicId, factorId=measure_on_time_factor_id)
					]
				),
				alias=f'column_{self.TIME_GROUP_COLUMN_ID}'
			)
		else:
			return SubjectDatasetColumn(
				columnId=self.TIME_GROUP_COLUMN_ID,
				parameter=TopicFactorParameter(
					kind=ParameterKind.TOPIC, topicId=self.topic.topicId, factorId=measure_on_time_factor_id),
				alias=f'column_{self.TIME_GROUP_COLUMN_ID}'
			)

	# noinspection PyMethodMayBeStatic
	def get_topic_id_from_time_group_column(self, column: SubjectDatasetColumn) -> TopicId:
		parameter = column.parameter
		if parameter.kind == ParameterKind.TOPIC:
			return parameter.topicId
		else:
			return parameter.parameters[0].topicId

	# noinspection PyMethodMayBeStatic
	def get_factor_id_from_time_group_column(self, column: SubjectDatasetColumn) -> FactorId:
		parameter = column.parameter
		if parameter.kind == ParameterKind.TOPIC:
			return parameter.factorId
		else:
			return parameter.parameters[0].factorId

	def fake_time_group_year_or_month_to_dataset_column(
			self, time_group_column: SubjectDatasetColumn) -> Optional[SubjectDatasetColumn]:
		topic_id = self.get_topic_id_from_time_group_column(time_group_column)
		topic = get_topic_service(self.principalService).find_by_id(topic_id)
		factor_id = self.get_factor_id_from_time_group_column(time_group_column)
		factor = ArrayHelper(topic.factors).find(lambda x: x.factorId == factor_id)
		if factor is None:
			raise IndicatorKernelException('Factor of time group column not found.')
		if self.is_datetime_factor(factor):
			return self.fake_time_group_year_or_month_column(topic.topicId, factor.factorId, time_group_column.alias)
		else:
			return None

	# noinspection PyMethodMayBeStatic
	def to_numeric_segments_bucket(self, bucket: Bucket) -> NumericSegmentsHolder:
		if isinstance(bucket, NumericSegmentsHolder):
			return bucket
		else:
			return NumericSegmentsHolder(**bucket.to_dict())

	# noinspection PyMethodMayBeStatic
	def to_category_segments_bucket(self, bucket: Bucket) -> CategorySegmentsHolder:
		if isinstance(bucket, CategorySegmentsHolder):
			return bucket
		else:
			return CategorySegmentsHolder(**bucket.to_dict())

	def to_numeric_range_case_route(
			self, segment: NumericValueSegment, include: RangeBucketValueIncluding,
			factor: Factor
	) -> Parameter:
		name = segment.name
		min_value = segment.value.min
		max_value = segment.value.max
		if include == RangeBucketValueIncluding.INCLUDE_MIN:
			min_operator = ParameterExpressionOperator.MORE_EQUALS
			max_operator = ParameterExpressionOperator.LESS
		else:
			min_operator = ParameterExpressionOperator.MORE
			max_operator = ParameterExpressionOperator.LESS_EQUALS

		return ConstantParameter(
			kind=ParameterKind.CONSTANT,
			conditional=True,
			on=ParameterJoint(
				jointType=ParameterJointType.AND,
				filters=ArrayHelper([
					None if min_value is not None else ParameterExpression(
						left=TopicFactorParameter(
							kind=ParameterKind.TOPIC, topicId=self.topic.topicId, factorId=factor.factorId),
						operator=min_operator,
						right=min_value
					),
					None if max_value is not None else ParameterExpression(
						left=TopicFactorParameter(
							kind=ParameterKind.TOPIC, topicId=self.topic.topicId, factorId=factor.factorId),
						operator=max_operator,
						right=max_value
					)
				]).map(lambda x: x is not None).to_list()
			),
			value=name
		)

	def to_category_case_route(self, segment: CategorySegment, factor: Factor) -> Parameter:
		return ConstantParameter(
			kind=ParameterKind.CONSTANT,
			conditional=True,
			on=ParameterJoint(
				jointType=ParameterJointType.AND,
				filters=[
					ParameterExpression(
						left=TopicFactorParameter(
							kind=ParameterKind.TOPIC, topicId=self.topic.topicId, factorId=factor.factorId),
						operator=ParameterExpressionOperator.IN,
						right=segment.value
					),
				]
			),
			value=segment.name
		)

	def fake_measure_on_column(
			self, measure_on: InspectMeasureOn, measure_on_index: int) -> Optional[SubjectDatasetColumn]:
		if measure_on is None or measure_on.type is None or measure_on.type == InspectMeasureOnType.NONE:
			return None
		# build factor
		if measure_on == InspectMeasureOnType.OTHER:
			measure_on_factor_id = measure_on.factorId
			if is_blank(measure_on_factor_id):
				return None
		elif measure_on == InspectMeasureOnType.VALUE:
			measure_on_factor_id = self.indicator.factorId
		else:
			return None
		measure_on_factor = self.find_factor(measure_on_factor_id, lambda: 'Measure on factor not declared.')
		# build bucket
		measure_on_bucket_id = measure_on.bucketId
		if is_blank(measure_on_bucket_id):
			if measure_on == InspectMeasureOnType.OTHER:
				# using naturally classification
				return SubjectDatasetColumn(
					columnId=f'{self.MEASURE_ON_COLUMN_ID}_{measure_on_index}',
					parameter=TopicFactorParameter(
						kind=ParameterKind.TOPIC, topicId=self.topic.topicId, factorId=measure_on_factor_id),
					alias=f'column_{self.MEASURE_ON_COLUMN_ID}_{measure_on_index}'
				)
			else:
				raise IndicatorKernelException('Measure on bucket not declared.')
		else:
			bucket = ask_bucket(measure_on_bucket_id, self.principalService)
			if measure_on == InspectMeasureOnType.VALUE:
				bucket = self.to_numeric_segments_bucket(bucket)
				include = RangeBucketValueIncluding.INCLUDE_MIN if bucket.include is None else bucket.include
				# at least has one value
				segments = ArrayHelper(bucket.segments) \
					.filter(lambda x: x.value is not None) \
					.filter(lambda x: x.value.min is not None or x.value.max is not None) \
					.to_list()
				if len(segments) == 0:
					raise IndicatorKernelException('Numeric range segments not declared.')
				return SubjectDatasetColumn(
					columnId=f'{self.MEASURE_ON_COLUMN_ID}_{measure_on_index}',
					parameter=ComputedParameter(
						kind=ParameterKind.COMPUTED, type=ParameterComputeType.CASE_THEN,
						parameters=[
							*ArrayHelper(segments).map(
								lambda x: self.to_numeric_range_case_route(x, include, measure_on_factor)).to_list(),
							# an anyway route, additional
							ConstantParameter(kind=ParameterKind.CONSTANT, value='-')
						]
					),
					alias=f'column_{self.MEASURE_ON_COLUMN_ID}_{measure_on_index}'
				)
			elif measure_on == InspectMeasureOnType.OTHER:
				bucket = self.to_category_segments_bucket(bucket)
				segments = ArrayHelper(bucket.segments) \
					.filter(lambda x: x.value is not None and len(x.value) != 0).to_list()
				if len(segments) == 0:
					raise IndicatorKernelException('Category segments not declared.')
				anyway_segment: CategorySegment = ArrayHelper(segments) \
					.find(lambda x: len(x.value) == 1 and x.value[0] == OtherCategorySegmentValue)
				if anyway_segment is not None:
					conditional_routes = ArrayHelper(segments).filter(lambda x: x != anyway_segment).to_list()
					anyway_route = ConstantParameter(kind=ParameterKind.CONSTANT, value=anyway_segment.name)
				else:
					conditional_routes = segments
					anyway_route = ConstantParameter(kind=ParameterKind.CONSTANT, value='-')

				return SubjectDatasetColumn(
					columnId=f'{self.MEASURE_ON_COLUMN_ID}_{measure_on_index}',
					parameter=ComputedParameter(
						kind=ParameterKind.COMPUTED, type=ParameterComputeType.CASE_THEN,
						parameters=[
							*ArrayHelper(conditional_routes).map(
								lambda x: self.to_category_case_route(x, measure_on_factor)).to_list(),
							anyway_route
						]
					),
					alias=f'column_{self.MEASURE_ON_COLUMN_ID}_{measure_on_index}'
				)
			else:
				raise IndicatorKernelException(f'Measure[{measure_on}] is not supported.')

	def fake_measure_on_to_dataset_column(self) -> List[SubjectDatasetColumn]:
		return ArrayHelper(self.inspection.measures) \
			.map_with_index(lambda x, index: self.fake_measure_on_column(x, index + 1)) \
			.filter(lambda x: x is not None) \
			.to_list()

	# noinspection DuplicatedCode
	def fake_time_range_to_dataset_filter(self) -> Optional[ParameterJoint]:
		time_range_factor_id = self.inspection.timeRangeFactorId
		if is_blank(time_range_factor_id):
			return None
		time_range_factor = self.find_factor(time_range_factor_id, lambda: 'Time range factor not declared.')
		time_ranges = ArrayHelper(self.inspection.timeRanges) \
			.filter(lambda x: x is not None and x.value is not None).to_list()
		if len(time_ranges) == 0:
			# no ranges given
			return None

		operator = ParameterExpressionOperator.EQUALS if len(time_ranges) == 1 else ParameterExpressionOperator.IN
		right = time_ranges[0].value if len(time_ranges) == 1 \
			else ArrayHelper(time_ranges).map(lambda x: x.value).join(',')
		time_range_measure = self.inspection.timeRangeMeasure
		if self.is_datetime_factor(time_range_factor):
			if time_range_measure == MeasureMethod.YEAR:
				compute_type = ParameterComputeType.YEAR_OF
			elif time_range_measure == MeasureMethod.MONTH:
				compute_type = ParameterComputeType.MONTH_OF
			else:
				raise IndicatorKernelException(
					f'Measure method[{time_range_measure}] for factor type[{time_range_factor.type}] is not supported.')
			joint = ParameterJoint(
				jointType=ParameterJointType.AND,
				filters=[
					ParameterExpression(
						left=ComputedParameter(
							kind=ParameterKind.COMPUTED,
							type=compute_type,
							parameters=[
								TopicFactorParameter(
									kind=ParameterKind.TOPIC,
									topicId=self.topic.topicId, factorId=time_range_factor_id)
							]
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
						left=TopicFactorParameter(
							kind=ParameterKind.TOPIC, topicId=self.topic.topicId, factorId=time_range_factor_id),
						operator=operator,
						right=ConstantParameter(kind=ParameterKind.CONSTANT, value=str(right))
					)
				]
			)
		return joint

	def has_indicator_filter(self) -> bool:
		return \
			self.indicator.filter is not None \
			and self.indicator.filter.enabled \
			and self.indicator.filter.joint is not None \
			and self.indicator.filter.joint.filters is not None \
			and len(self.indicator.filter.joint.filters) != 0

	# noinspection DuplicatedCode
	def fake_criteria_to_dataset_filter(self) -> Optional[ParameterJoint]:
		criteria = ArrayHelper(self.inspection.criteria).filter(lambda x: x is not None).to_list()
		if len(criteria) == 0:
			return None

		def to_condition(a_criteria: IndicatorCriteria) -> ParameterCondition:
			factor = self.find_factor(
				a_criteria.factorId,
				lambda: f'Factor of inspection criteria[{criteria.to_dict()}] not declared.')
			return self.fake_criteria_to_condition(a_criteria)(self.topic.topicId, factor.factorId)

		return ParameterJoint(
			jointType=ParameterJointType.AND,
			filters=ArrayHelper(criteria).map(to_condition).to_list()
		)

	# noinspection DuplicatedCode
	def build_filters(self) -> Optional[ParameterJoint]:
		time_range_filter = self.fake_time_range_to_dataset_filter()
		inspection_filter = self.fake_criteria_to_dataset_filter()
		indicator_filter = self.indicator.filter.joint if self.has_indicator_filter() else None
		filters = ArrayHelper([time_range_filter, inspection_filter, indicator_filter]) \
			.filter(lambda x: x is not None) \
			.to_list()
		if len(filters) == 0:
			return None
		else:
			return ParameterJoint(jointType=ParameterJointType.AND, filters=filters)

	def fake_to_subject(self) -> Subject:
		"""
		columns:
			[indicator column]
			[time group column]: optional, existing when time group declared
			[time group year/month column]: optional, existing when time group declared and original factor is datetime
			[measure_on_1, [measure_on_2, measure_on_3, ...]]: optional
		"""
		dataset_columns: List[SubjectDatasetColumn] = []
		# append indicator factor anyway
		indicator_factor_column = self.fake_indicator_factor_to_dataset_column()
		dataset_columns.append(indicator_factor_column)
		# append time group if exists
		time_group_column = self.fake_time_group_to_dataset_column()
		if time_group_column is not None:
			# append time group column
			dataset_columns.append(time_group_column)
			time_group_year_or_month_column = self.fake_time_group_year_or_month_to_dataset_column(time_group_column)
			if time_group_year_or_month_column is not None:
				dataset_columns.append(time_group_year_or_month_column)
		# measures
		measure_on_columns = self.fake_measure_on_to_dataset_column()
		if len(measure_on_columns) != 0:
			ArrayHelper(measure_on_columns).each(lambda x: dataset_columns.append(x))

		dataset_filters: Optional[ParameterJoint] = self.build_filters()
		return Subject(dataset=SubjectDataset(columns=dataset_columns, filters=dataset_filters))

	def fake_report_indicators(self) -> List[ReportIndicator]:
		indicators: List[ReportIndicator] = []
		self.fake_report_indicator(indicators, self.INDICATOR_FACTOR_COLUMN_ID)
		return indicators

	def fake_to_report(self, subject: Subject) -> Report:
		"""
		build report based on subject, columns in subject refers to fake_to_subject
		"""
		# build indicators
		indicators: List[ReportIndicator] = self.fake_report_indicators()

		# build dimensions: measure on 1, measure on 2, ..., time group
		dimensions: List[ReportDimension] = []

		# measures to dimensions
		def measure_to_dimension(column: SubjectDatasetColumn, index: int) -> None:
			dimensions.append(ReportDimension(columnId=column.columnId, name=f'_BUCKET_ON_{index}_'))

		ArrayHelper(subject.dataset.columns) \
			.filter(lambda x: x.columnId.startswith(self.MEASURE_ON_COLUMN_ID)) \
			.each_with_index(lambda x, index: measure_to_dimension(x, index + 1))

		# time group to dimensions
		time_group_year_or_month_column = ArrayHelper(subject.dataset.columns) \
			.find(lambda x: x.columnId == self.TIME_GROUP_YEAR_OR_MONTH_COLUMN_ID)
		if time_group_year_or_month_column is not None:
			dimensions.append(
				ReportDimension(columnId=self.TIME_GROUP_YEAR_OR_MONTH_COLUMN_ID, name='_TIME_GROUP_'))
		else:
			time_group_column = ArrayHelper(subject.dataset.columns) \
				.find(lambda x: x.columnId == self.TIME_GROUP_COLUMN_ID)
			if time_group_column is not None:
				dimensions.append(ReportDimension(columnId=self.TIME_GROUP_COLUMN_ID, name='_TIME_GROUP_'))

		if len(dimensions) == 0:
			raise IndicatorKernelException('Neither time group nor bucket on found.')

		return Report(indicators=indicators, dimensions=dimensions)

	# noinspection PyMethodMayBeStatic
	def move_indicators_to_tail(self, row: DataResultSetRow, move_count: int) -> DataResultSetRow:
		return [*row[move_count:], *row[:move_count]]

	def find(self) -> DataResult:
		subject = self.fake_to_subject()
		report = self.fake_to_report(subject)
		report_data_service = get_report_data_service(subject, report, self.principalService)
		# reorder columns, move indicators to tail of row
		data_result = report_data_service.find()
		move_column_count = len(report.indicators)
		return DataResult(
			columns=data_result.columns,
			data=ArrayHelper(data_result.data).map(
				lambda x: self.move_indicators_to_tail(x, move_column_count)).to_list()
		)
