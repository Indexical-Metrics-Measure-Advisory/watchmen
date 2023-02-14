from decimal import Decimal
from typing import Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_model.common import DataResult, ParameterJoint, ParameterJointType, SubjectId
from watchmen_model.console import Report, Subject, SubjectDataset
from watchmen_model.indicator import Indicator, IndicatorAggregateArithmetic, Objective, ObjectiveFactorOnIndicator
from .data_service import ObjectiveFactorDataService
from ..utils.time_frame import TimeFrame
from ...common import IndicatorKernelException


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

	def ask_breakdown_values(self, time_frame: Optional[TimeFrame]) -> DataResult:
		subject, report = self.fake_a_report(time_frame)
		# TODO ADD GROUPING COLUMNS
		# merge indicator filter to subject filter
		report_data_service = self.get_report_data_service(subject, report)
		return report_data_service.find()
