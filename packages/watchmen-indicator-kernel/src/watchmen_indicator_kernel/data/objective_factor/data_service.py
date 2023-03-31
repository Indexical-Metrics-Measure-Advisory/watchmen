from abc import abstractmethod
from decimal import Decimal
from enum import Enum
from typing import Optional, List, Tuple, Union, Dict

from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_indicator_kernel.data.objective_factor.objective_criteria_service import ObjectiveCriteriaService
from watchmen_model.admin import Factor, Topic, FactorType, EnumItem
from watchmen_model.common import DataResult, ParameterJoint, SubjectDatasetColumnId, ConstantParameter, ParameterKind, \
	ComputedParameter, ParameterComputeType, Parameter, ParameterJointType, ParameterExpression, TopicFactorParameter, \
	ParameterExpressionOperator, TopicId, BucketId, DataResultSet
from watchmen_model.console import Report, ReportIndicator, ReportIndicatorArithmetic, SubjectDatasetColumn
from watchmen_model.indicator import Indicator, IndicatorAggregateArithmetic, Objective, ObjectiveFactorOnIndicator, \
	CategorySegmentsHolder, Bucket, CategorySegment, OtherCategorySegmentValue, MeasureMethod, BucketType, \
	RangeBucketValueIncluding, NumericSegmentsHolder, NumericValueSegment
from watchmen_model.indicator.derived_objective import BreakdownTarget, BreakdownDimension
from watchmen_utilities import ArrayHelper, is_decimal
from ..utils import ask_bucket, find_factor
from ..utils.time_frame import TimeFrame



class ObjectiveTargetBreakdownValueRow (BaseModel):
	dimensions: List =[]
	currentValue: Optional[Decimal] = None
	previousValue: Optional[Decimal] = None
	chainValue: Optional[Decimal]= None


class ObjectiveTargetBreakdownValues (BaseModel):
	breakdownUuid: str = None
	data: List[ObjectiveTargetBreakdownValueRow] = []
	failed: bool = False




class ObjectiveFactorDataService(ObjectiveCriteriaService):
	def __init__(
			self, objective: Objective, objective_factor: ObjectiveFactorOnIndicator, indicator: Indicator,
			principal_service: PrincipalService):
		super().__init__(objective, objective_factor, indicator, principal_service)
		self.MEASURE_ON_COLUMN_ID: str = 'measure_on_column'
		self.FAKED_ONLY_COLUMN_ID = 'FAKED_ONLY_COLUMN_ID'
		self.FAKED_DIMENSION_ID = 'faked_dimension_id'
		self.FAKED_ONLY_COLUMN_NAME = 'faked_only_column_name'
		self.FAKED_DIMENSION_NAME = 'faked_dimension_name'

	def replace_result_data_for_enum(self, data_result: DataResult, enum_dict: Dict[int, Enum]) -> DataResultSet:
		for row_index, data_row in enumerate(data_result.data):
			for index, data in enumerate(data_row[1:]):
				if index in enum_dict:
					enum_items = enum_dict[index].items
					enum_label = self.find_enum_items_value(enum_items, data)
					if enum_label:
						data_result.data[row_index][index + 1] = enum_label

		return data_result.data

	@staticmethod
	def mapping_param_compute_type_to_measure_type(measure_method: MeasureMethod) -> ParameterComputeType:
		if measure_method == MeasureMethod.YEAR:
			return ParameterComputeType.YEAR_OF
		elif measure_method == MeasureMethod.MONTH:
			return ParameterComputeType.MONTH_OF
		else:
			raise Exception("measure Method {} is not correct ".format(measure_method.value))

	@staticmethod
	def is_datetime_factor(factor_or_type: Union[Factor, FactorType]) -> bool:
		factor_type = factor_or_type.type if isinstance(factor_or_type, Factor) else factor_or_type
		return \
			factor_type == FactorType.DATETIME \
			or factor_type == FactorType.FULL_DATETIME \
			or factor_type == FactorType.DATE \
			or factor_type == FactorType.DATE_OF_BIRTH

	@staticmethod
	def find_enum_items_value(enum_items: List[EnumItem], value) -> str:
		for item in enum_items:
			if item.code == value:
				return item.label

	@staticmethod
	def is_enum_factor(factor: Factor):
		if factor.type == FactorType.ENUM and factor.enumId is not None:
			return True
		else:
			return False

	def load_bucket_data(self,bucket_id:BucketId)->Bucket:
		bucket:Bucket = ask_bucket(bucket_id,self.get_principal_service())
		return bucket

	@staticmethod
	def to_category_segments_bucket(bucket: Bucket) -> CategorySegmentsHolder:
		if isinstance(bucket, CategorySegmentsHolder):
			return bucket
		else:
			return CategorySegmentsHolder(**bucket.to_dict())

	@staticmethod
	def to_category_case_route(segment: CategorySegment, factor: Factor, topic_id:TopicId) -> Parameter:
		return ConstantParameter(
			kind=ParameterKind.CONSTANT,
			conditional=True,
			on=ParameterJoint(
				jointType=ParameterJointType.AND,
				filters=[
					ParameterExpression(
						left=TopicFactorParameter(
							kind=ParameterKind.TOPIC, topicId=topic_id, factorId=factor.factorId),
						operator=ParameterExpressionOperator.IN,
						right=ConstantParameter(value=segment.value)
					),
				]
			),
			value=segment.name
		)

	def to_numeric_segments_bucket(self, bucket: Bucket) -> NumericSegmentsHolder:
		if isinstance(bucket, NumericSegmentsHolder):
			return bucket
		else:
			return NumericSegmentsHolder(**bucket.to_dict())

	def to_numeric_range_case_route(
			self, segment: NumericValueSegment, include: RangeBucketValueIncluding,
			factor: Factor,topic_id:TopicId
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

		filters = ArrayHelper([
					None if min_value is  None else ParameterExpression(
						left=TopicFactorParameter(
							kind=ParameterKind.TOPIC, topicId=topic_id, factorId=factor.factorId),
						operator=min_operator,
						right=ConstantParameter(value=min_value)
					),
					None if max_value is None else ParameterExpression(
						left=TopicFactorParameter(
							kind=ParameterKind.TOPIC, topicId=topic_id, factorId=factor.factorId),
						operator=max_operator,
						right=ConstantParameter(value=max_value)
					)
				]).filter(lambda x: x is not None).to_list()
		return ConstantParameter(
			kind=ParameterKind.CONSTANT,
			conditional=True,
			on=ParameterJoint(
				jointType=ParameterJointType.AND,
				filters=filters
			),
			value=name
		)
	def build_bucket_dataset_column(self, breakdown_dim:BreakdownDimension, index,measure_on_factor:Factor ,topic_id:TopicId):
		if breakdown_dim.bucketId is None:
			raise Exception("BreakdownDimensionType is BUCKET , but bucketId is None")
		bucket = self.to_category_segments_bucket(self.load_bucket_data(breakdown_dim.bucketId))
		if bucket.type == BucketType.ENUM_MEASURE or bucket.type == BucketType.CATEGORY_MEASURE:
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
			subject_column = SubjectDatasetColumn(
				columnId=f'{self.MEASURE_ON_COLUMN_ID}_{index}',
				parameter=ComputedParameter(
					kind=ParameterKind.COMPUTED, type=ParameterComputeType.CASE_THEN,
					parameters=[
						*ArrayHelper(conditional_routes).map(
							lambda x: self.to_category_case_route(x, measure_on_factor,topic_id)).to_list(),
						anyway_route
					]
				),
				alias=f'column_{self.MEASURE_ON_COLUMN_ID}_{index}'
			)

			return subject_column
		elif bucket.type == BucketType.VALUE or BucketType.VALUE_MEASURE:
			bucket = self.to_numeric_segments_bucket(bucket)
			include = RangeBucketValueIncluding.INCLUDE_MIN if bucket.include is None else bucket.include
			# at least has one value
			segments = ArrayHelper(bucket.segments) \
				.filter(lambda x: x.value is not None) \
				.filter(lambda x: x.value.min is not None or x.value.max is not None) \
				.to_list()
			if len(segments) == 0:
				raise IndicatorKernelException('Numeric range segments not declared.')
			subject_column =  SubjectDatasetColumn(
				columnId=f'{self.MEASURE_ON_COLUMN_ID}_{index}',
				parameter=ComputedParameter(
					kind=ParameterKind.COMPUTED, type=ParameterComputeType.CASE_THEN,
					parameters=[
						*ArrayHelper(segments).map(
							lambda x: self.to_numeric_range_case_route(x, include, measure_on_factor,topic_id)).to_list(),
						# an anyway route, additional
						ConstantParameter(kind=ParameterKind.CONSTANT, value='-')
					]
				),
				alias=f'column_{self.MEASURE_ON_COLUMN_ID}_{index}'
			)

			return subject_column
	def fake_criteria_to_filter(self, time_frame: Optional[TimeFrame]) -> Optional[ParameterJoint]:
		objective_factor = self.get_objective_factor()
		if not objective_factor.conditional:
			# ask all data
			return None

		factor_filter = objective_factor.filter

		if factor_filter is None or factor_filter.filters is None:
			# no filter declared
			return None

		conditions = ArrayHelper(factor_filter.filters).filter(lambda x: x is not None).to_list()
		if len(conditions) == 0:
			return None

		return ParameterJoint(
			jointType=self.as_joint_type(factor_filter.conj),
			filters=self.translate_parameter_conditions(conditions, time_frame))

	def fake_to_report(self, column_id: SubjectDatasetColumnId) -> Report:
		"""
		create report by given column, which only contains a report indicator with arithmetic appointed by indicator of factor
		"""

		def match_arithmetic(one: IndicatorAggregateArithmetic, to_be: IndicatorAggregateArithmetic) -> bool:
			return to_be == one or to_be.value == one

		arithmetic = self.get_indicator().aggregateArithmetic
		if arithmetic is None:
			arithmetic = IndicatorAggregateArithmetic.SUM

		if match_arithmetic(arithmetic, IndicatorAggregateArithmetic.COUNT):
			report_indicator_name = '_COUNT_'
			report_indicator_arithmetic = ReportIndicatorArithmetic.COUNT

		elif match_arithmetic(arithmetic, IndicatorAggregateArithmetic.SUM):
			report_indicator_name = '_SUM_'
			report_indicator_arithmetic = ReportIndicatorArithmetic.SUMMARY

		elif match_arithmetic(arithmetic, IndicatorAggregateArithmetic.AVG):
			report_indicator_name = '_AVG_'
			report_indicator_arithmetic = ReportIndicatorArithmetic.AVERAGE

		elif match_arithmetic(arithmetic, IndicatorAggregateArithmetic.MAX):
			report_indicator_name = '_MAX_'
			report_indicator_arithmetic = ReportIndicatorArithmetic.MAXIMUM

		elif match_arithmetic(arithmetic, IndicatorAggregateArithmetic.MIN):
			report_indicator_name = '_MIN_'
			report_indicator_arithmetic = ReportIndicatorArithmetic.MINIMUM

		elif match_arithmetic(arithmetic, IndicatorAggregateArithmetic.DISTINCT_COUNT):
			report_indicator_name = '_DISTINCT_COUNT_'
			report_indicator_arithmetic = ReportIndicatorArithmetic.DISTINCT_COUNT
		else:
			raise IndicatorKernelException(f'Indicator aggregate arithmetics[{arithmetic}] is not supported.')

		return Report(indicators=[
			ReportIndicator(columnId=column_id, name=report_indicator_name, arithmetic=report_indicator_arithmetic)
		], dimensions=[])


	# noinspection PyMethodMayBeStatic
	def get_value_from_result(self, data_result: DataResult) -> Decimal:
		if len(data_result.data) == 0:
			return Decimal('0')
		else:
			value = data_result.data[0][0]
			parsed, decimal_value = is_decimal(value)
			return decimal_value if parsed else Decimal('0')

	@abstractmethod
	def ask_value(self, time_frame: Optional[TimeFrame]) -> Optional[Decimal]:
		pass

	@abstractmethod
	def ask_breakdown_values(self, time_frame: Optional[TimeFrame],breakdown_target :BreakdownTarget) -> DataResult:
		pass
