from decimal import Decimal
from typing import Callable, List, Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_inquiry_kernel.storage import ReportDataService
from watchmen_model.admin import Factor, Topic
from watchmen_model.common import FactorId, Parameter, ParameterCondition, ParameterJoint, ParameterJointType, \
	ParameterKind, TopicFactorParameter, TopicId
from watchmen_model.console import Report, Subject, SubjectDataset, SubjectDatasetColumn
from watchmen_model.indicator import AchievementIndicator, Indicator, IndicatorCriteria
from watchmen_utilities import ArrayHelper, is_blank, is_decimal
from .achievement_data_service import AchievementDataService


def get_report_data_service(subject: Subject, report: Report, principal_service: PrincipalService) -> ReportDataService:
	return ReportDataService(subject, report, principal_service, True)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


class TopicBaseAchievementDataService(AchievementDataService):
	def __init__(
			self, achievement_indicator: AchievementIndicator,
			indicator: Indicator, topic: Topic, principal_service: PrincipalService):
		super().__init__(achievement_indicator, principal_service)
		self.indicator = indicator
		self.topic = topic

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
		indicator_factor = self.find_factor(
			self.indicator.factorId,
			lambda: f'Indicator[id={self.indicator.indicatorId}, name={self.indicator.name}] factor not declared.')
		return SubjectDatasetColumn(
			columnId='1',
			parameter=TopicFactorParameter(
				kind=ParameterKind.TOPIC, topicId=self.topic.topicId, factorId=indicator_factor.factorId),
			alias='column_1'
		)

	def build_value_criteria_left(self, topic_id: TopicId, factor_id: FactorId, value: Optional[str]) -> Parameter:
		if is_blank(value):
			return super().build_value_criteria_left(topic_id, factor_id, value)

		return self.build_value_criteria_left_on_factor(
			topic_id, factor_id, value,
			lambda: ArrayHelper(self.topic.factors).find(lambda x: x.factorId == factor_id))

	# noinspection DuplicatedCode
	def fake_criteria_to_dataset_filter(self) -> Optional[ParameterJoint]:
		criteria = ArrayHelper(self.achievementIndicator.criteria).filter(lambda x: x is not None).to_list()
		if len(criteria) == 0:
			return None

		def to_condition(a_criteria: IndicatorCriteria) -> ParameterCondition:
			factor = self.find_factor(
				a_criteria.factorId,
				lambda: f'Factor of achievement indicator criteria[{criteria.to_dict()}] not declared.')
			return self.fake_criteria_to_condition(a_criteria)(self.topic.topicId, factor.factorId)

		return ParameterJoint(
			jointType=ParameterJointType.AND,
			filters=ArrayHelper(criteria).map(to_condition).to_list()
		)

	def has_indicator_filter(self) -> bool:
		return \
			self.indicator.filter is not None \
			and self.indicator.filter.enabled \
			and self.indicator.filter.joint is not None \
			and self.indicator.filter.joint.filters is not None \
			and len(self.indicator.filter.joint.filters) != 0

	# noinspection DuplicatedCode
	def build_filters(self) -> Optional[ParameterJoint]:
		a_filter = self.fake_criteria_to_dataset_filter()
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

	def fake_to_subject(self) -> Subject:
		dataset_columns: List[SubjectDatasetColumn] = [self.fake_indicator_factor_to_dataset_column()]
		dataset_filters: Optional[ParameterJoint] = self.build_filters()
		return Subject(dataset=SubjectDataset(columns=dataset_columns, filters=dataset_filters))

	def ask_value(self) -> Optional[Decimal]:
		subject = self.fake_to_subject()
		report = self.fake_to_report()('1')
		report_data_service = get_report_data_service(subject, report, self.principalService)
		data_result = report_data_service.find()
		if len(data_result.data) == 0:
			return Decimal('0')
		else:
			value = data_result.data[0][0]
			parsed, decimal_value = is_decimal(value)
			return decimal_value if parsed else Decimal('0')
