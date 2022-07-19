from decimal import Decimal
from typing import Callable, Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import TopicService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_inquiry_kernel.storage import ReportDataService
from watchmen_model.admin import Factor
from watchmen_model.common import FactorId, Parameter, ParameterCondition, ParameterJoint, ParameterJointType, \
	SubjectDatasetColumnId, TopicFactorParameter, TopicId
from watchmen_model.console import Report, Subject, SubjectDatasetColumn
from watchmen_model.indicator import AchievementIndicator, Indicator, IndicatorCriteria
from watchmen_utilities import ArrayHelper, is_blank, is_decimal
from .achievement_data_service import AchievementDataService


def get_report_data_service(subject: Subject, report: Report, principal_service: PrincipalService) -> ReportDataService:
	return ReportDataService(subject, report, principal_service, True)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


class SubjectBaseAchievementDataService(AchievementDataService):
	def __init__(
			self, achievement_indicator: AchievementIndicator,
			indicator: Indicator, subject: Subject, principal_service: PrincipalService):
		super().__init__(achievement_indicator, principal_service)
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

	def build_value_criteria_left(self, topic_id: TopicId, factor_id: FactorId, value: Optional[str]) -> Parameter:
		if is_blank(value):
			return super().build_value_criteria_left(topic_id, factor_id, value)

		column: SubjectDatasetColumn = ArrayHelper(self.subject.dataset.columns).find(lambda x: x.columnId == factor_id)
		parameter = column.parameter
		if isinstance(parameter, TopicFactorParameter):
			def ask_factor() -> Factor:
				topic = get_topic_service(self.principalService).find_by_id(parameter.topicId)
				return ArrayHelper(topic.factors).find(lambda x: x.factorId == parameter.factorId)

			return self.build_value_criteria_left_on_factor(topic_id, factor_id, value, ask_factor)
		else:
			return super().build_value_criteria_left(topic_id, factor_id, value)

	# noinspection DuplicatedCode
	def fake_criteria_to_report(self) -> Optional[ParameterJoint]:
		criteria = ArrayHelper(self.achievementIndicator.criteria).filter(lambda x: x is not None).to_list()
		if len(criteria) == 0:
			return None

		def to_condition(a_criteria: IndicatorCriteria) -> ParameterCondition:
			column = self.find_column(
				a_criteria.factorId,
				lambda: f'Column of achievement indicator criteria[{criteria.to_dict()}] not declared.')
			return self.fake_criteria_to_condition(a_criteria)('1', column.columnId)

		return ParameterJoint(
			jointType=ParameterJointType.AND,
			filters=ArrayHelper(criteria).map(to_condition).to_list()
		)

	def ask_value(self) -> Optional[Decimal]:
		report_indicator_column_id = self.indicator.factorId
		report = self.fake_to_report()(report_indicator_column_id)
		report_filter = self.fake_criteria_to_report()
		if report_filter is not None:
			report.filters = report_filter
		report_data_service = get_report_data_service(self.subject, report, self.principalService)
		data_result = report_data_service.find()
		if len(data_result.data) == 0:
			return Decimal('0')
		else:
			value = data_result.data[0][0]
			parsed, decimal_value = is_decimal(value)
			return decimal_value if parsed else Decimal('0')
