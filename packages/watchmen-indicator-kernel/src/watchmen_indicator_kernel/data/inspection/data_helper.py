from datetime import datetime

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_model.common import SubjectId, TopicId
from watchmen_model.indicator import Indicator, IndicatorBaseOn, Inspection
from watchmen_utilities import is_not_blank
from .inspection_data_service import InspectionDataService
from .subject_base_service import SubjectBaseInspectionDataService
from .topic_base_service import TopicBaseInspectionDataService
from ..criteria_helper import redress_inspection
from ..indicator_helper import ask_indicator
from ..subject_helper import ask_subject
from ..topic_helper import ask_topic


def get_topic_base_service(
		inspection: Inspection, indicator: Indicator, topic_id: TopicId,
		dt: datetime,
		principal_service: PrincipalService
) -> TopicBaseInspectionDataService:
	topic = ask_topic(topic_id, principal_service)
	clone_inspection = redress_inspection(inspection, topic, dt, principal_service)
	return TopicBaseInspectionDataService(clone_inspection, indicator, topic, principal_service)


def get_subject_base_service(
		inspection: Inspection, indicator: Indicator, subject_id: SubjectId,
		dt: datetime,
		principal_service: PrincipalService
) -> SubjectBaseInspectionDataService:
	subject = ask_subject(subject_id, principal_service)
	clone_inspection = redress_inspection(inspection, subject, dt, principal_service)
	return SubjectBaseInspectionDataService(clone_inspection, indicator, subject, principal_service)


def get_inspection_data_service(
		inspection: Inspection, dt: datetime, principal_service: PrincipalService) -> InspectionDataService:
	"""
	to identify that given inspection is based on topic or subject
	"""
	indicator = ask_indicator(inspection.indicatorId, principal_service)
	topic_or_subject_id = indicator.topicOrSubjectId
	base_on = indicator.baseOn
	if base_on == IndicatorBaseOn.TOPIC and is_not_blank(topic_or_subject_id):
		return get_topic_base_service(inspection, indicator, topic_or_subject_id, dt, principal_service)
	elif base_on == IndicatorBaseOn.SUBJECT and is_not_blank(topic_or_subject_id):
		return get_subject_base_service(inspection, indicator, topic_or_subject_id, dt, principal_service)
	else:
		raise IndicatorKernelException('Indicator is not based on topic or subject, not supported yet.')