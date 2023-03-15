from datetime import datetime
from typing import List, Optional, Tuple, Union

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_indicator_kernel.data.utils import ask_bucket, TimeFrame, \
	translate_computation_operator_in_factor_filter, translate_expression_operator
from watchmen_inquiry_kernel.storage import ReportDataService
from watchmen_model.common import BucketId, ComputedParameter, ConstantParameter, Parameter, ParameterCondition, \
	ParameterExpression, ParameterExpressionOperator, ParameterJoint, ParameterJointType, ParameterKind, SubjectId, \
	TopicFactorParameter, TopicId
from watchmen_model.console import Report, Subject
from watchmen_model.indicator import BucketObjectiveParameter, CategorySegment, CategorySegmentsHolder, \
	ComputedObjectiveParameter, ConstantObjectiveParameter, Indicator, NumericSegmentsHolder, NumericValueSegment, \
	Objective, ObjectiveFactorOnIndicator, ObjectiveParameter, ObjectiveParameterCondition, \
	ObjectiveParameterExpression, ObjectiveParameterExpressionOperator, ObjectiveParameterJoint, \
	ObjectiveParameterJointType, ObjectiveVariable, ObjectiveVariableOnBucket, ObjectiveVariableOnRange, \
	ObjectiveVariableOnValue, OtherCategorySegmentValue, RangeBucketValueIncluding, ReferObjectiveParameter, \
	TimeFrameObjectiveParameter
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank


class ObjectiveCriteriaService:
	def __init__(
			self,
			objective: Objective, objective_factor: ObjectiveFactorOnIndicator, indicator: Indicator,
			principal_service: PrincipalService):
		self.principalService = principal_service
		self.objective = objective
		self.objectiveFactor = objective_factor
		self.indicator = indicator

	def get_principal_service(self) -> PrincipalService:
		return self.principalService

	def get_objective(self) -> Objective:
		return self.objective

	def get_objective_variables(self) -> List[ObjectiveVariable]:
		return ArrayHelper(self.get_objective().variables).filter(lambda x: x is not None).to_list()

	def get_objective_factor(self) -> ObjectiveFactorOnIndicator:
		return self.objectiveFactor

	def on_factor_msg(self) -> str:
		return \
			f'objective factor[' \
			f'objectiveId={self.get_objective().objectiveId}, ' \
			f'factorUuid={self.get_objective_factor().uuid}]'

	def get_indicator(self) -> Indicator:
		return self.indicator

	def has_indicator_filter(self) -> bool:
		indicator = self.get_indicator()
		return \
				indicator.filter is not None \
				and indicator.filter.enabled \
				and indicator.filter.joint is not None \
				and indicator.filter.joint.filters is not None \
				and len(indicator.filter.joint.filters) != 0

	# noinspection PyMethodMayBeStatic
	def get_report_data_service(self, subject: Subject, report: Report) -> ReportDataService:
		return ReportDataService(subject, report, self.get_principal_service(), True)

	# noinspection PyMethodMayBeStatic
	def as_time_frame(self, frame: Optional[Tuple[datetime, datetime]]) -> Optional[TimeFrame]:
		return None if frame is None else TimeFrame(start=frame[0], end=frame[1])

	def ask_filter_base_id(self) -> Union[TopicId, SubjectId]:
		"""
		ask the entity id of filter base, it is what indicator based.
		"""
		raise NotImplementedError('Function ask_filter_base_id not implemented yet.')

	def find_objective_variable_from_constant(
			self, parameter: ConstantObjectiveParameter) -> Optional[ObjectiveVariable]:
		"""
		true when detect bucket or range variable in constant
		"""
		value = parameter.value
		if is_blank(value):
			return None
		value = value.strip()
		if not value.startswith('{') or not value.endswith('}'):
			return None
		value = value.lstrip('{').rstrip('}').strip()
		if not value.startswith('&'):
			return None
		value = value.lstrip('&')
		if value.startswith(' '):
			raise IndicatorKernelException(f'Illegal constant value[{value}] on {self.on_factor_msg()}.')
		value = value.strip()

		def is_variable_matched(variable: ObjectiveVariable) -> bool:
			name = '' if is_blank(variable.name) else variable.name.strip()
			return name == value

		# return true if any variable is referred
		variables = self.get_objective_variables()
		return ArrayHelper(variables).find(is_variable_matched)

	def translate_parameter(
			self, parameter: ObjectiveParameter, use_conditional: bool,
			time_frame: Optional[TimeFrame]) -> Parameter:
		if use_conditional:
			conditional = parameter.conditional,
			on = None if parameter.on is None else self.translate_parameter_condition(parameter.on, time_frame)
		else:
			conditional = False
			on = None

		if isinstance(parameter, ReferObjectiveParameter):
			# refer to indicator base
			uuid = parameter.uuid
			return TopicFactorParameter(
				kind=ParameterKind.TOPIC,
				conditional=conditional, on=on,
				topicId=self.ask_filter_base_id(), factorId=uuid
			)
		elif isinstance(parameter, ConstantObjectiveParameter):
			# always be normal constant, special cases are processed in condition translation
			return ConstantParameter(
				kind=ParameterKind.CONSTANT,
				conditional=conditional, on=on,
				value=parameter.value
			)
		elif isinstance(parameter, ComputedObjectiveParameter):
			translated_parameters = ArrayHelper(parameter.parameters) \
				.map(lambda x: self.translate_parameter(x, True, time_frame)) \
				.to_list()
			return ComputedParameter(
				kind=ParameterKind.COMPUTED,
				conditional=conditional, on=on,
				operator=translate_computation_operator_in_factor_filter(parameter.operator),
				parameter=translated_parameters
			)
		else:
			raise IndicatorKernelException(
				f'Objective parameter[{parameter.to_dict()}] not supported, on {self.on_factor_msg()}.')

	# noinspection PyMethodMayBeStatic
	def fake_numeric_segment_to_condition(
			self,
			include: Union[RangeBucketValueIncluding, str], segment: Union[NumericValueSegment, dict], invert: bool,
			left: Parameter
	) -> ParameterCondition:
		if isinstance(include, str):
			include = RangeBucketValueIncluding(include)
		if not isinstance(segment, NumericValueSegment):
			segment = NumericValueSegment(**segment)
		if segment.value is None:
			raise IndicatorKernelException(f'Numeric bucket segment not declared, on {self.on_factor_msg()}].')

		min_value = segment.value.min
		max_value = segment.value.max
		if include == RangeBucketValueIncluding.INCLUDE_MIN:
			# include min, means not include max
			operator_min = ParameterExpressionOperator.MORE_EQUALS
			operator_max = ParameterExpressionOperator.LESS
		else:
			# not include min, means include max
			operator_min = ParameterExpressionOperator.MORE
			operator_max = ParameterExpressionOperator.LESS_EQUALS
		if invert:
			# reverse conjunction and operator
			joint_type = ParameterJointType.OR
			if operator_min == ParameterExpressionOperator.MORE_EQUALS:
				operator_min = ParameterExpressionOperator.LESS
			else:
				operator_min = ParameterExpressionOperator.LESS_EQUALS
			if operator_max == ParameterExpressionOperator.LESS:
				operator_max = ParameterExpressionOperator.MORE_EQUALS
			else:
				operator_max = ParameterExpressionOperator.MORE
		else:
			joint_type = ParameterJointType.AND

		if is_not_blank(min_value) and is_not_blank(max_value):
			return ParameterJoint(
				jointType=joint_type,
				filters=[
					ParameterExpression(
						left=left, operator=operator_min,
						right=ConstantParameter(kind=ParameterKind.CONSTANT, value=min_value)),
					ParameterExpression(
						left=left, operator=operator_max,
						right=ConstantParameter(kind=ParameterKind.CONSTANT, value=max_value))
				]
			)
		elif is_not_blank(min_value):
			return ParameterExpression(
				left=left, operator=operator_min,
				right=ConstantParameter(kind=ParameterKind.CONSTANT, value=min_value))
		elif is_not_blank(max_value):
			return ParameterExpression(
				left=left, operator=operator_max,
				right=ConstantParameter(kind=ParameterKind.CONSTANT, value=max_value))
		else:
			raise IndicatorKernelException(
				'Neither minimum not maximum value of numeric value segment is declared.')

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
			self,
			segment: Union[CategorySegment, dict], segments: Optional[List[Union[CategorySegment, dict]]], invert: bool,
			left: Parameter
	) -> ParameterCondition:
		if not isinstance(segment, CategorySegment):
			segment = CategorySegment(**segment)

		values = ArrayHelper(segment.value).filter(lambda x: is_not_blank(x)).to_list()
		if len(values) == 0:
			raise IndicatorKernelException('Value of category segment not declared.')
		if len(values) == 1 and values[0] == OtherCategorySegmentValue:
			# other values
			values = self.gather_defined_category_values(segments)
			if len(values) == 0:
				raise IndicatorKernelException('Values rather than others of category segment not declared.')
			if invert:
				return ParameterExpression(
					left=left, operator=ParameterExpressionOperator.IN,
					right=ConstantParameter(kind=ParameterKind.CONSTANT, value=ArrayHelper(values).join(',')))
			else:
				return ParameterExpression(
					left=left, operator=ParameterExpressionOperator.NOT_IN,
					right=ConstantParameter(kind=ParameterKind.CONSTANT, value=ArrayHelper(values).join(',')))
		else:
			if invert:
				return ParameterExpression(
					left=left, operator=ParameterExpressionOperator.NOT_IN,
					right=ConstantParameter(kind=ParameterKind.CONSTANT, value=ArrayHelper(values).join(',')))
			else:
				return ParameterExpression(
					left=left, operator=ParameterExpressionOperator.IN,
					right=ConstantParameter(kind=ParameterKind.CONSTANT, value=ArrayHelper(values).join(',')))

	def translate_expression_with_bucket_on_right(
			self,
			bucket_id: Optional[BucketId], segment_name: Optional[str],
			condition: ObjectiveParameterExpression, translated_left: Parameter
	) -> ParameterCondition:
		operator = condition.operator

		if is_blank(bucket_id):
			raise IndicatorKernelException(
				f'Objective expression condition[{condition.to_dict()}] not supported, '
				f'because bucket not declared, on {self.on_factor_msg()}.')
		if is_blank(segment_name):
			raise IndicatorKernelException(
				f'Objective expression condition[{condition.to_dict()}] not supported, '
				f'because segment not declared, on {self.on_factor_msg()}.')
		bucket = ask_bucket(bucket_id, self.get_principal_service())
		segment = ArrayHelper(bucket.segments).find(lambda x: x.name == segment_name)
		if segment is None:
			raise IndicatorKernelException(
				f'Objective expression condition[{condition.to_dict()}] not supported, '
				f'because segment[bucketId=[{bucket_id}], name={segment_name}] not found, '
				f'on {self.on_factor_msg()}.')
		if isinstance(bucket, NumericSegmentsHolder):
			include = bucket.include
			return self.fake_numeric_segment_to_condition(
				include, segment, operator == ObjectiveParameterExpressionOperator.NOT_EQUALS, translated_left)
		elif isinstance(bucket, CategorySegmentsHolder):
			return self.fake_category_segment_to_condition(
				segment, bucket.segments, operator == ObjectiveParameterExpressionOperator.NOT_EQUALS,
				translated_left)
		else:
			bucket_data = bucket.to_dict()
			include = bucket_data.get('include')
			if include is not None:
				return self.fake_numeric_segment_to_condition(
					include, segment, operator == ObjectiveParameterExpressionOperator.NOT_EQUALS,
					translated_left)
			else:
				# noinspection PyTypeChecker
				return self.fake_category_segment_to_condition(
					segment, bucket.segments, operator == ObjectiveParameterExpressionOperator.NOT_EQUALS,
					translated_left)

	def check_left(self, condition: ObjectiveParameterExpression) -> ObjectiveParameter:
		left = condition.left
		if left is None:
			# left side must be declared
			raise IndicatorKernelException(
				f'Objective expression condition[{condition.to_dict()}] not supported, because left not declared, '
				f'on {self.on_factor_msg()}.')
		elif isinstance(left, BucketObjectiveParameter):
			# left side cannot be bucket parameter
			raise IndicatorKernelException(
				f'Objective expression condition[{condition.to_dict()}] not supported, because left cannot be bucket, '
				f'on {self.on_factor_msg()}.')
		elif isinstance(left, TimeFrameObjectiveParameter):
			# left side cannot be time frame parameter
			raise IndicatorKernelException(
				f'Objective expression condition[{condition.to_dict()}] not supported, '
				f'because left cannot be time frame, '
				f'on {self.on_factor_msg()}.')
		elif isinstance(left, ConstantObjectiveParameter):
			# when left is constant
			variable = self.find_objective_variable_from_constant(left)
			if isinstance(variable, ObjectiveVariableOnBucket) or isinstance(variable, ObjectiveVariableOnRange):
				# can not refer to bucket variable or range variable
				raise IndicatorKernelException(
					f'Objective expression condition[{condition.to_dict()}] not supported, '
					f'because using bucket or range variable in left, '
					f'on {self.on_factor_msg()}.')
		return left

	def check_right(
			self, condition: ObjectiveParameterExpression, time_frame: Optional[TimeFrame]
	) -> Optional[ObjectiveParameter]:
		left = condition.left
		operator = condition.operator
		right = condition.right
		if right is None:
			# when right is not declared
			if operator != ObjectiveParameterExpressionOperator.EMPTY \
					and operator != ObjectiveParameterExpressionOperator.NOT_EMPTY:
				# operator must be empty or not-empty
				raise IndicatorKernelException(
					f'Objective expression condition[{condition.to_dict()}] not supported, '
					f'right not declared when operator is not one of empty/not-empty, on {self.on_factor_msg()}.')
		elif isinstance(right, BucketObjectiveParameter):
			# when right is bucket parameter
			if operator != ObjectiveParameterExpressionOperator.EQUALS \
					and operator != ObjectiveParameterExpressionOperator.NOT_EQUALS:
				# operator must be equals or not-equals
				raise IndicatorKernelException(
					f'Objective expression condition[{condition.to_dict()}] not supported, '
					f'because right cannot be bucket when operator is not one of equals/not-equals, '
					f'on {self.on_factor_msg()}.')
			if not isinstance(left, ReferObjectiveParameter):
				# left must be reference parameter
				raise IndicatorKernelException(
					f'Objective expression condition[{condition.to_dict()}] not supported, '
					f'because using bucket in right and left is not refer parameter, '
					f'on {self.on_factor_msg()}.')
		elif isinstance(right, TimeFrameObjectiveParameter):
			if operator != ObjectiveParameterExpressionOperator.EQUALS \
					and operator != ObjectiveParameterExpressionOperator.NOT_EQUALS:
				# operator must be equals or not-equals
				raise IndicatorKernelException(
					f'Objective expression condition[{condition.to_dict()}] not supported, '
					f'because right cannot be time frame when operator is not one of equals/not-equals, '
					f'on {self.on_factor_msg()}.')
			if time_frame is None:
				raise IndicatorKernelException(
					f'Objective expression condition[{condition.to_dict()}] not supported, '
					f'because time frame parameter declared, but no time frame passed, '
					f'on {self.on_factor_msg()}.')

			## remove below check ,already supported
		# elif isinstance(right, ConstantObjectiveParameter):
		# 	# when right is constant parameter
		# 	variable = self.find_objective_variable_from_constant(right)
		# 	if isinstance(variable, ObjectiveVariableOnBucket) or isinstance(variable, ObjectiveVariableOnRange):
		# 		pass
		# 		# refer to bucket variable or range variable is not allowed
		# 		# raise IndicatorKernelException(
		# 		# 	f'Objective expression condition[{condition.to_dict()}] not supported, '
		# 		# 	f'because using bucket or range variable in left, '
		# 		# 	f'on {self.on_factor_msg()}.')
		return right

	# noinspection PyMethodMayBeStatic
	def use_move_date_func(self, dt: datetime) -> str:
		return f'{{&moveDate(&now, Y{dt.year}M{dt.month}D{dt.day}h{dt.hour}m{dt.minute}s{dt.second})}}'

	# noinspection PyMethodMayBeStatic
	def as_joint_type(self, conj: Optional[ObjectiveParameterJointType]) -> ParameterJointType:
		return ParameterJointType.OR if conj == ObjectiveParameterJointType.OR else ParameterJointType.AND

	def translate_parameter_conditions(
			self, conditions: List[ObjectiveParameterCondition], time_frame: Optional[TimeFrame]
	) -> List[ParameterCondition]:
		return ArrayHelper(conditions) \
			.map(lambda x: self.translate_parameter_condition(x, time_frame)) \
			.to_list()

	def translate_parameter_condition(
			self, condition: ObjectiveParameterCondition, time_frame: Optional[TimeFrame]) -> ParameterCondition:
		if isinstance(condition, ObjectiveParameterJoint):
			return ParameterJoint(
				jointType=self.as_joint_type(condition.conj),
				filters=self.translate_parameter_conditions(condition.filters, time_frame)
			)
		elif isinstance(condition, ObjectiveParameterExpression):
			left = self.check_left(condition)
			operator = condition.operator
			right = self.check_right(condition, time_frame)

			translated_left = self.translate_parameter(condition.left, False, time_frame)
			if right is None:
				# no right declared, should be empty/not-empty
				return ParameterExpression(
					left=translated_left,
					operator=translate_expression_operator(operator),
					right=None)
			elif isinstance(right, BucketObjectiveParameter):
				# right is bucket parameter
				return self.translate_expression_with_bucket_on_right(
					right.bucketId, right.segmentName, condition, translated_left)
			elif isinstance(right, TimeFrameObjectiveParameter):
				return ParameterJoint(
					jointType=ParameterJointType.AND,
					filters=[
						ParameterExpression(
							left=translated_left, operator=ParameterExpressionOperator.MORE_EQUALS,
							right=ConstantParameter(
								kind=ParameterKind.CONSTANT, value=self.use_move_date_func(time_frame.start))),
						ParameterExpression(
							left=translated_left, operator=ParameterExpressionOperator.LESS_EQUALS,
							right=ConstantParameter(
								kind=ParameterKind.CONSTANT, value=self.use_move_date_func(time_frame.end)))
					]
				)
			elif isinstance(right, ConstantObjectiveParameter):
				# right is constant parameter
				variable = self.find_objective_variable_from_constant(right)
				if variable is None:
					# not refer any factor variable, treated as normal
					return ParameterExpression(
						left=translated_left,
						operator=translate_expression_operator(operator),
						right=self.translate_parameter(right, False, time_frame)
					)
				elif isinstance(variable, ObjectiveVariableOnBucket):
					# refer to bucket variable
					return self.translate_expression_with_bucket_on_right(
						variable.bucketId, variable.segmentName, condition, translated_left)
				elif isinstance(variable, ObjectiveVariableOnRange):
					# refer to range variable
					op_min = ParameterExpressionOperator.MORE_EQUALS if variable.includeMin else ParameterExpressionOperator.MORE
					op_max = ParameterExpressionOperator.LESS_EQUALS if variable.includeMax else ParameterExpressionOperator.LESS
					exp_min = None
					exp_max = None
					if is_not_blank(variable.min):
						exp_min = ParameterExpression(
							left=translated_left, operator=op_min,
							right=ConstantParameter(kind=ParameterKind.CONSTANT, value=variable.min))
					elif is_not_blank(variable.max):
						exp_max = ParameterExpression(
							left=translated_left, operator=op_max,
							right=ConstantParameter(kind=ParameterKind.CONSTANT, value=variable.max))
					if exp_min is not None and exp_max is not None:
						return ParameterJoint(jointType=ParameterJointType.AND, filters=[exp_min, exp_max])
					elif exp_min is not None:
						return exp_min
					elif exp_max is not None:
						return exp_max
					else:
						raise IndicatorKernelException(
							f'Objective parameter condition[{condition.to_dict()}] not supported, '
							f'because neither min nor max declared, '
							f'on {self.on_factor_msg()}.')
				elif isinstance(variable, ObjectiveVariableOnValue):
					# no special, treated as normal constant
					return ParameterExpression(
						left=translated_left,
						operator=translate_expression_operator(operator),
						right=ConstantParameter(kind=ParameterKind.CONSTANT, value=variable.value)
					)
				else:
					raise IndicatorKernelException(
						f'Objective parameter condition[{condition.to_dict()}] not supported, on {self.on_factor_msg()}.')
			else:
				return ParameterExpression(
					left=translated_left,
					operator=translate_expression_operator(operator),
					right=self.translate_parameter(right, False, time_frame)
				)
		else:
			raise IndicatorKernelException(
				f'Objective parameter condition[{condition.to_dict()}] not supported, on {self.on_factor_msg()}.')
