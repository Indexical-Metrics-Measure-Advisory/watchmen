from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_model.common import SubjectId, TopicId
from watchmen_model.indicator import Indicator, IndicatorBaseOn, Inspection
from watchmen_utilities import is_not_blank
from .indicator_helper import ask_indicator
from .inspection_data_service import InspectionDataService
from .subject_base_inspection_data_service import SubjectBaseInspectionDataService
from .subject_helper import ask_subject
from .topic_base_inspection_data_service import TopicBaseInspectionDataService
from .topic_helper import ask_topic


def get_topic_base_service(
		inspection: Inspection, indicator: Indicator, topic_id: TopicId,
		principal_service: PrincipalService
) -> TopicBaseInspectionDataService:
	return TopicBaseInspectionDataService(
		inspection, indicator, ask_topic(topic_id, principal_service), principal_service)


def get_subject_base_service(
		inspection: Inspection, indicator: Indicator, subject_id: SubjectId,
		principal_service: PrincipalService
) -> SubjectBaseInspectionDataService:
	return SubjectBaseInspectionDataService(
		inspection, indicator, ask_subject(subject_id, principal_service), principal_service)


def get_inspection_data_service(inspection: Inspection, principal_service: PrincipalService) -> InspectionDataService:
	"""
	to identify that given inspection is based on topic or subject
	"""
	indicator = ask_indicator(inspection.indicatorId, principal_service)
	topic_or_subject_id = indicator.topicOrSubjectId
	base_on = indicator.baseOn
	if base_on == IndicatorBaseOn.TOPIC and is_not_blank(topic_or_subject_id):
		return get_topic_base_service(inspection, indicator, topic_or_subject_id, principal_service)
	elif base_on == IndicatorBaseOn.SUBJECT and is_not_blank(topic_or_subject_id):
		return get_subject_base_service(inspection, indicator, topic_or_subject_id, principal_service)
	else:
		raise IndicatorKernelException('Indicator is not based on topic or subject, not supported yet.')
