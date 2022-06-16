from abc import abstractmethod
from decimal import Decimal
from typing import Callable, List, Optional, Union

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_indicator_kernel.data.bucket_helper import ask_bucket
from watchmen_model.admin import Factor, FactorType
from watchmen_model.common import BucketId, ComputedParameter, ConstantParameter, FactorId, Parameter, \
	ParameterComputeType, ParameterCondition, ParameterExpression, ParameterExpressionOperator, ParameterJoint, \
	ParameterJointType, ParameterKind, TopicFactorParameter, TopicId
from watchmen_model.console import Report, ReportIndicator, ReportIndicatorArithmetic
from watchmen_model.indicator import AchievementIndicator, AchievementIndicatorCriteria, \
	AchievementIndicatorCriteriaOnBucket, AchievementIndicatorCriteriaOnExpression, \
	AchievementIndicatorCriteriaOperator, CategorySegment, CategorySegmentsHolder, IndicatorAggregateArithmetic, \
	NumericSegmentsHolder, NumericValueSegment, OtherCategorySegmentValue, RangeBucketValueIncluding
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank


class AchievementDataService:
	def __init__(self, achievement_indicator: AchievementIndicator, principal_service: PrincipalService):
		self.achievementIndicator = achievement_indicator
		self.principalService = principal_service

	# noinspection PyMethodMayBeStatic
	def fake_numeric_segment_to_condition(
			self, include: Union[RangeBucketValueIncluding, str],
			segment: Union[NumericValueSegment, dict]) -> Callable[[TopicId, FactorId], ParameterCondition]:
		if isinstance(include, str):
			include = RangeBucketValueIncluding(include)
		if not isinstance(segment, NumericValueSegment):
			segment = NumericValueSegment(**segment)
		if segment.value is None:
			raise IndicatorKernelException('Numeric bucket segment not declared.')

		def action(topic_id: TopicId, factor_id: FactorId) -> ParameterCondition:
			min_value = segment.value.min
			max_value = segment.value.max
			if include == RangeBucketValueIncluding.INCLUDE_MIN:
				operator_min = ParameterExpressionOperator.MORE_EQUALS
			else:
				operator_min = ParameterExpressionOperator.MORE
			if include == RangeBucketValueIncluding.INCLUDE_MIN:
				operator_max = ParameterExpressionOperator.LESS
			else:
				operator_max = ParameterExpressionOperator.LESS_EQUALS
			if is_not_blank(min_value) and is_not_blank(max_value):
				return ParameterJoint(
					jointType=ParameterJointType.AND,
					filters=[
						ParameterExpression(
							left=TopicFactorParameter(
								kind=ParameterKind.TOPIC, topicId=topic_id, factorId=factor_id),
							operator=operator_min,
							right=min_value
						),
						ParameterExpression(
							left=TopicFactorParameter(
								kind=ParameterKind.TOPIC, topicId=topic_id, factorId=factor_id),
							operator=operator_max,
							right=max_value
						)
					]
				)
			elif is_not_blank(min_value):
				return ParameterExpression(
					left=TopicFactorParameter(
						kind=ParameterKind.TOPIC, topicId=topic_id, factorId=factor_id),
					operator=operator_min,
					right=min_value
				)
			elif is_not_blank(max_value):
				return ParameterExpression(
					left=TopicFactorParameter(
						kind=ParameterKind.TOPIC, topicId=topic_id, factorId=factor_id),
					operator=operator_max,
					right=max_value
				)
			else:
				raise IndicatorKernelException(
					'Neither minimum not maximum value of numeric value segment is declared.')

		return action

	# noinspection PyMethodMayBeStatic
	def gather_defined_category_values(self, segments: Optional[List[Union[CategorySegment, dict]]]) -> List[str]:
		def gather(segment: CategorySegment, values: List[str]) -> List[str]:
			ArrayHelper(segment.value).filter(lambda x: is_not_blank(x)).each(lambda x: values.append(x)).to_list()
			return values

		return ArrayHelper(segments) \
			.filter(lambda x: x is not None) \
			.map(lambda x: x if isinstance(x, CategorySegment) else CategorySegment(**x)) \
			.reduce(lambda values, x: gather(x, values), [])

	def fake_category_segment_to_condition(
			self, segment: Union[CategorySegment, dict],
			segments: Optional[List[Union[CategorySegment, dict]]]
	) -> Callable[[TopicId, FactorId], ParameterExpression]:
		if not isinstance(segment, CategorySegment):
			segment = CategorySegment(**segment)

		def action(topic_id: TopicId, factor_id: FactorId) -> ParameterExpression:
			values = ArrayHelper(segment.value).filter(lambda x: is_not_blank(x)).to_list()
			if len(values) == 0:
				raise IndicatorKernelException('Value of category segment not declared.')
			if len(values) == 1 and values[0] == OtherCategorySegmentValue:
				# other values
				values = self.gather_defined_category_values(segments)
				if len(values) == 0:
					raise IndicatorKernelException('No values rather than others of category segment not declared.')
				return ParameterExpression(
					left=TopicFactorParameter(
						kind=ParameterKind.TOPIC, topicId=topic_id, factorId=factor_id),
					operator=ParameterExpressionOperator.NOT_IN,
					right=values
				)
			else:
				return ParameterExpression(
					left=TopicFactorParameter(
						kind=ParameterKind.TOPIC, topicId=topic_id, factorId=factor_id),
					operator=ParameterExpressionOperator.IN,
					right=values
				)

		return action

	def fake_bucket_criteria_to_condition(
			self, bucket_id: Optional[BucketId], bucket_segment_name: Optional[str]
	) -> Callable[[TopicId, FactorId], ParameterCondition]:
		def action(topic_id: TopicId, factor_id: FactorId) -> ParameterCondition:
			if is_blank(bucket_id):
				raise IndicatorKernelException('Bucket of achievement indicator not declared.')
			if is_blank(bucket_segment_name):
				raise IndicatorKernelException('Bucket segment name of achievement indicator not declared.')
			bucket = ask_bucket(bucket_id, self.principalService)
			segment = ArrayHelper(bucket.segments).find(lambda x: x.name == bucket_segment_name)
			if segment is None:
				raise IndicatorKernelException(f'Bucket segment[name={bucket_segment_name}] not found.')
			if isinstance(bucket, NumericSegmentsHolder):
				include = bucket.include
				return self.fake_numeric_segment_to_condition(include, segment)(topic_id, factor_id)
			elif isinstance(bucket, CategorySegmentsHolder):
				return self.fake_category_segment_to_condition(segment, bucket.segments)(topic_id, factor_id)
			else:
				bucket_data = bucket.to_dict()
				if bucket_data.get('include') is not None:
					return self.fake_numeric_segment_to_condition(
						bucket_data.get('include'), segment)(topic_id, factor_id)
				else:
					# noinspection PyTypeChecker
					return self.fake_category_segment_to_condition(segment, bucket.segments)(topic_id, factor_id)

		return action

	# noinspection PyMethodMayBeStatic
	def has_year_or_month(self, factor: Factor) -> bool:
		return \
			factor.type == FactorType.DATETIME \
			or factor.type == FactorType.FULL_DATETIME \
			or factor.type == FactorType.DATE \
			or factor.type == FactorType.DATE_OF_BIRTH

	# noinspection PyMethodMayBeStatic,PyUnusedLocal
	def build_topic_factor_parameter(self, topic_id: TopicId, factor_id: FactorId) -> Parameter:
		return TopicFactorParameter(kind=ParameterKind.TOPIC, topicId=topic_id, factorId=factor_id)

	def build_value_criteria_left_on_factor(
			self, topic_id: TopicId, factor_id: FactorId, value: Optional[str],
			ask_factor: Callable[[], Factor]
	) -> Parameter:
		value = value.strip()
		value_length = len(value.strip())
		if value_length != 1 and value_length != 2 and value_length != 4:
			# not month or year
			return self.build_topic_factor_parameter(topic_id, factor_id)

		factor: Factor = ask_factor()
		if not self.has_year_or_month(factor):
			return self.build_topic_factor_parameter(topic_id, factor_id)

		if value_length == 4:
			# year
			return ComputedParameter(
				kind=ParameterKind.COMPUTED,
				type=ParameterComputeType.YEAR_OF,
				parameters=[TopicFactorParameter(kind=ParameterKind.TOPIC, topicId=topic_id, factorId=factor_id)]
			)
		else:
			# month
			return ComputedParameter(
				kind=ParameterKind.COMPUTED,
				type=ParameterComputeType.MONTH_OF,
				parameters=[TopicFactorParameter(kind=ParameterKind.TOPIC, topicId=topic_id, factorId=factor_id)]
			)

	# noinspection PyMethodMayBeStatic,PyUnusedLocal
	def build_value_criteria_left(self, topic_id: TopicId, factor_id: FactorId, value: Optional[str]) -> Parameter:
		return self.build_topic_factor_parameter(topic_id, factor_id)

	# noinspection PyMethodMayBeStatic,PyUnusedLocal
	def build_value_criteria_right(self, topic_id: TopicId, factor_id: FactorId, value: Optional[str]):
		return ConstantParameter(kind=ParameterKind.CONSTANT, value=value)

	# noinspection PyMethodMayBeStatic
	def fake_value_criteria_to_condition(
			self, operator: Optional[AchievementIndicatorCriteriaOperator], value: Optional[str]
	) -> Callable[[TopicId, FactorId], ParameterExpression]:
		def action(topic_id: TopicId, factor_id: FactorId) -> ParameterExpression:
			if operator is None:
				raise IndicatorKernelException('Operator of achievement indicator not declared.')
			if is_blank(value):
				raise IndicatorKernelException('Compare value of achievement indicator not declared.')
			if operator == AchievementIndicatorCriteriaOperator.EQUALS:
				expression_operator = ParameterExpressionOperator.EQUALS
			elif operator == AchievementIndicatorCriteriaOperator.NOT_EQUALS:
				expression_operator = ParameterExpressionOperator.NOT_EQUALS
			elif operator == AchievementIndicatorCriteriaOperator.LESS:
				expression_operator = ParameterExpressionOperator.LESS
			elif operator == AchievementIndicatorCriteriaOperator.LESS_EQUALS:
				expression_operator = ParameterExpressionOperator.LESS_EQUALS
			elif operator == AchievementIndicatorCriteriaOperator.MORE:
				expression_operator = ParameterExpressionOperator.MORE
			elif operator == AchievementIndicatorCriteriaOperator.MORE_EQUALS:
				expression_operator = ParameterExpressionOperator.MORE_EQUALS
			else:
				raise IndicatorKernelException(f'Criteria value operator[{operator}] is not supported.')
			return ParameterExpression(
				left=self.build_value_criteria_left(topic_id, factor_id, value),
				operator=expression_operator,
				right=self.build_value_criteria_right(topic_id, factor_id, value)
			)

		return action

	def fake_criteria_to_condition(
			self, criteria: AchievementIndicatorCriteria) -> Callable[[TopicId, FactorId], ParameterCondition]:
		def action(topic_id: TopicId, factor_id: FactorId) -> ParameterCondition:
			if isinstance(criteria, AchievementIndicatorCriteriaOnBucket):
				return self.fake_bucket_criteria_to_condition(
					criteria.bucketId, criteria.bucketSegmentName)(topic_id, factor_id)
			elif isinstance(criteria, AchievementIndicatorCriteriaOnExpression):
				return self.fake_value_criteria_to_condition(criteria.operator, criteria.value)(topic_id, factor_id)
			else:
				data = criteria.to_dict()
				if is_not_blank(data.get('bucketId')) and is_not_blank(data.get('bucketSegmentName')):
					return self.fake_bucket_criteria_to_condition(
						data.get('bucketId'), data.get('bucketSegmentName'))(topic_id, factor_id)
				elif data.get('operator') is not None and is_not_blank(str(data.get('value'))):
					return self.fake_value_criteria_to_condition(
						data.get('operator'), str(data.get('value')))(topic_id, factor_id)
				else:
					raise IndicatorKernelException(f'Achievement indicator criteria[{data}] not supported.')

		return action

	def fake_to_report(self) -> Callable[[FactorId], Report]:
		def action(factor_id: FactorId) -> Report:
			arithmetic = self.achievementIndicator.aggregateArithmetic
			if arithmetic is None:
				report_indicator = ReportIndicator(
					columnId=factor_id, name='_SUM_', arithmetic=ReportIndicatorArithmetic.SUMMARY)
			elif IndicatorAggregateArithmetic.COUNT == arithmetic or IndicatorAggregateArithmetic.COUNT.value == arithmetic:
				report_indicator = ReportIndicator(
					columnId=factor_id, name='_COUNT_', arithmetic=ReportIndicatorArithmetic.COUNT)
			elif IndicatorAggregateArithmetic.SUM == arithmetic or IndicatorAggregateArithmetic.SUM.value == arithmetic:
				report_indicator = ReportIndicator(
					columnId=factor_id, name='_SUM_', arithmetic=ReportIndicatorArithmetic.SUMMARY)
			elif IndicatorAggregateArithmetic.AVG == arithmetic or IndicatorAggregateArithmetic.AVG.value == arithmetic:
				report_indicator = ReportIndicator(
					columnId=factor_id, name='_AVG_', arithmetic=ReportIndicatorArithmetic.AVERAGE)
			elif IndicatorAggregateArithmetic.MAX == arithmetic or IndicatorAggregateArithmetic.MAX.value == arithmetic:
				report_indicator = ReportIndicator(
					columnId=factor_id, name='_MAX_', arithmetic=ReportIndicatorArithmetic.MAXIMUM)
			elif IndicatorAggregateArithmetic.MIN == arithmetic or IndicatorAggregateArithmetic.MIN.value == arithmetic:
				report_indicator = ReportIndicator(
					columnId=factor_id, name='_MIN_', arithmetic=ReportIndicatorArithmetic.MINIMUM)
			else:
				raise IndicatorKernelException(f'Indicator aggregate arithmetics[{arithmetic}] is not supported.')

			return Report(indicators=[report_indicator], dimensions=[])

		return action

	@abstractmethod
	def ask_value(self) -> Optional[Decimal]:
		pass
