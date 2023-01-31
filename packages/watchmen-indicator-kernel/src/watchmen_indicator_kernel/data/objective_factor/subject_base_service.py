from decimal import Decimal
from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_model.common import ParameterJoint, ParameterJointType, SubjectId
from watchmen_model.console import Report, Subject, SubjectDataset
from watchmen_model.indicator import Indicator, Objective, ObjectiveFactorOnIndicator
from .data_service import ObjectiveFactorDataService
from ..utils.time_frame import TimeFrame


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

	def fake_criteria_to_report(self, report: Report, time_frame: Optional[TimeFrame]):
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

	def ask_value(self, time_frame: Optional[TimeFrame]) -> Optional[Decimal]:
		# the indicator factor, actually which is column from subject, is the indicator column of report
		report_indicator_column_id = self.indicator.factorId
		# fake report
		report = self.fake_to_report(report_indicator_column_id)
		# fake objective factor to report factor, since they are both based on subject itself
		self.fake_criteria_to_report(report, time_frame)
		# merge indicator filter to subject filter
		report_data_service = self.get_report_data_service(self.fake_to_subject(), report)
		data_result = report_data_service.find()
		return self.get_value_from_result(data_result)
