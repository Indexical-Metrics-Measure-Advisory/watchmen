from abc import abstractmethod
from typing import Optional, Tuple, Union

from watchmen_auth import PrincipalService
from watchmen_model.admin import Factor, FactorType
from watchmen_model.common import ComputedParameter, DataResult, DataResultSet, FactorId, ParameterComputeType, \
	ParameterKind, TopicFactorParameter, TopicId
from watchmen_model.console import SubjectDatasetColumn
from watchmen_model.console.subject import SubjectColumnArithmetic
from watchmen_model.indicator import Inspection, MeasureMethod
from watchmen_utilities import is_blank
from .indicator_criteria_service import IndicatorCriteriaService


class InspectionDataService(IndicatorCriteriaService):
	def __init__(self, inspection: Inspection, principal_service: PrincipalService):
		super().__init__(principal_service)
		self.inspection = inspection
		self.FAKE_TIME_GROUP_COLUMN_ID = 'fake_time_group'

	def has_time_group(self) -> Tuple[bool, Optional[FactorId], Optional[MeasureMethod]]:
		measure_on_time_factor_id = self.inspection.measureOnTimeFactorId
		if is_blank(measure_on_time_factor_id):
			return False, None, None
		measure_on_time = self.inspection.measureOnTime
		if measure_on_time is None:
			return False, None, None

		return True, measure_on_time_factor_id, measure_on_time

	# noinspection PyMethodMayBeStatic
	def has_year_or_month(self, factor: Union[Factor, FactorType]) -> bool:
		factor_type = factor.type if isinstance(factor, Factor) else factor
		return \
			factor_type == FactorType.DATETIME \
			or factor_type == FactorType.FULL_DATETIME \
			or factor_type == FactorType.DATE \
			or factor_type == FactorType.DATE_OF_BIRTH

	def fake_time_group_column(
			self, topic_id: TopicId, factor_id: FactorId, name: str) -> Optional[SubjectDatasetColumn]:
		# fake a new column into subject
		if self.inspection.measureOnTime == MeasureMethod.YEAR:
			return SubjectDatasetColumn(
				columnId=self.FAKE_TIME_GROUP_COLUMN_ID,
				parameter=ComputedParameter(
					kind=ParameterKind.COMPUTED,
					type=ParameterComputeType.YEAR_OF,
					parameters=[
						TopicFactorParameter(
							kind=ParameterKind.TOPIC,
							topicId=topic_id,
							factorId=factor_id
						)
					]
				),
				alias=f'{name}_YEAR_',
				arithmetic=SubjectColumnArithmetic.NONE
			)
		elif self.inspection.measureOnTime == MeasureMethod.MONTH:
			return SubjectDatasetColumn(
				columnId=self.FAKE_TIME_GROUP_COLUMN_ID,
				parameter=ComputedParameter(
					kind=ParameterKind.COMPUTED,
					type=ParameterComputeType.MONTH_OF,
					parameters=[
						TopicFactorParameter(
							kind=ParameterKind.TOPIC,
							topicId=topic_id,
							factorId=factor_id
						)
					]
				),
				alias=f'{name}_MONTH_',
				arithmetic=SubjectColumnArithmetic.NONE
			)
		else:
			return

	@abstractmethod
	def find(self) -> DataResult:
		pass

	def find_data(self) -> DataResultSet:
		return self.find().data
