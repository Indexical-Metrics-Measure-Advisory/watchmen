from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_model.common import SubjectId, TopicId
from watchmen_model.indicator import Indicator, IndicatorBaseOn, NavigationIndicator
from watchmen_utilities import is_not_blank
from .indicator_helper import ask_indicator
from .navigation_data_service import NavigationDataService
from .subject_base_navigation_data_service import SubjectBaseNavigationDataService
from .subject_helper import ask_subject
from .topic_base_navigation_data_service import TopicBaseNavigationDataService
from .topic_helper import ask_topic


def get_topic_base_service(
		navigation_indicator: NavigationIndicator, indicator: Indicator, topic_id: TopicId,
		principal_service: PrincipalService
) -> TopicBaseNavigationDataService:
	return TopicBaseNavigationDataService(
		navigation_indicator, indicator, ask_topic(topic_id, principal_service), principal_service)


def get_subject_base_service(
		navigation_indicator: NavigationIndicator, indicator: Indicator, subject_id: SubjectId,
		principal_service: PrincipalService
) -> SubjectBaseNavigationDataService:
	return SubjectBaseNavigationDataService(
		navigation_indicator, indicator, ask_subject(subject_id, principal_service), principal_service)


def get_navigation_data_service(
		navigation_indicator: NavigationIndicator, principal_service: PrincipalService) -> NavigationDataService:
	"""
	to identify that given navigation is based on topic or subject
	"""
	indicator = ask_indicator(navigation_indicator.indicatorId, principal_service)
	topic_or_subject_id = indicator.topicOrSubjectId
	base_on = indicator.baseOn
	if base_on == IndicatorBaseOn.TOPIC and is_not_blank(topic_or_subject_id):
		return get_topic_base_service(navigation_indicator, indicator, topic_or_subject_id, principal_service)
	elif base_on == IndicatorBaseOn.SUBJECT and is_not_blank(topic_or_subject_id):
		return get_subject_base_service(navigation_indicator, indicator, topic_or_subject_id, principal_service)
	else:
		raise IndicatorKernelException('Indicator is not based on topic, not supported yet.')
