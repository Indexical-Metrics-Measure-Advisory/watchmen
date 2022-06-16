from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_model.common import SubjectId, TopicId
from watchmen_model.indicator import AchievementIndicator, Indicator, IndicatorBaseOn
from watchmen_utilities import is_not_blank
from .achievement_data_service import AchievementDataService
from .indicator_helper import ask_indicator
from .subject_base_achievement_data_service import SubjectBaseAchievementDataService
from .subject_helper import ask_subject
from .topic_base_achievement_data_service import TopicBaseAchievementDataService
from .topic_helper import ask_topic


def get_topic_base_service(
		achievement_indicator: AchievementIndicator, indicator: Indicator, topic_id: TopicId,
		principal_service: PrincipalService
) -> TopicBaseAchievementDataService:
	return TopicBaseAchievementDataService(
		achievement_indicator, indicator, ask_topic(topic_id, principal_service), principal_service)


def get_subject_base_service(
		achievement_indicator: AchievementIndicator, indicator: Indicator, subject_id: SubjectId,
		principal_service: PrincipalService
) -> SubjectBaseAchievementDataService:
	return SubjectBaseAchievementDataService(
		achievement_indicator, indicator, ask_subject(subject_id, principal_service), principal_service)


def get_achievement_data_service(
		achievement_indicator: AchievementIndicator, principal_service: PrincipalService) -> AchievementDataService:
	"""
	to identify that given achievement is based on topic or subject
	"""
	indicator = ask_indicator(achievement_indicator.indicatorId, principal_service)
	topic_or_subject_id = indicator.topicOrSubjectId
	base_on = indicator.baseOn
	if base_on == IndicatorBaseOn.TOPIC and is_not_blank(topic_or_subject_id):
		return get_topic_base_service(achievement_indicator, indicator, topic_or_subject_id, principal_service)
	elif base_on == IndicatorBaseOn.SUBJECT and is_not_blank(topic_or_subject_id):
		return get_subject_base_service(achievement_indicator, indicator, topic_or_subject_id, principal_service)
	else:
		raise IndicatorKernelException('Indicator is not based on topic, not supported yet.')
