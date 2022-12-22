from datetime import datetime

from watchmen_auth import PrincipalService
from .indicator_data_service import AchievementIndicatorDataService


# def get_topic_base_service(
# 		achievement_indicator: AchievementIndicator, indicator: Indicator, topic_id: TopicId,
# 		dt: datetime,
# 		principal_service: PrincipalService
# ) -> TopicBaseAchievementIndicatorDataService:
# 	topic = ask_topic(topic_id, principal_service)
# 	clone_achievement_indicator = redress_achievement_indicator(achievement_indicator, topic, dt, principal_service)
# 	return TopicBaseAchievementIndicatorDataService(clone_achievement_indicator, indicator, topic, principal_service)
#
#
# def get_subject_base_service(
# 		achievement_indicator: AchievementIndicator, indicator: Indicator, subject_id: SubjectId,
# 		dt: datetime,
# 		principal_service: PrincipalService
# ) -> SubjectBaseAchievementIndicatorDataService:
# 	subject = ask_subject(subject_id, principal_service)
# 	clone_achievement_indicator = redress_achievement_indicator(achievement_indicator, subject, dt, principal_service)
# 	return SubjectBaseAchievementIndicatorDataService(
# 		clone_achievement_indicator, indicator, subject, principal_service)

# TODO REFACTOR-OBJECTIVE ACHIEVEMENT DATA SERVICE
def get_achievement_indicator_data_service(
		dt: datetime, principal_service: PrincipalService) -> AchievementIndicatorDataService:
	"""
	to identify that given achievement is based on topic or subject
	"""
	# indicator = ask_indicator(achievement_indicator.indicatorId, principal_service)
	# topic_or_subject_id = indicator.topicOrSubjectId
	# base_on = indicator.baseOn
	# if base_on == IndicatorBaseOn.TOPIC and is_not_blank(topic_or_subject_id):
	# 	return get_topic_base_service(achievement_indicator, indicator, topic_or_subject_id, dt, principal_service)
	# elif base_on == IndicatorBaseOn.SUBJECT and is_not_blank(topic_or_subject_id):
	# 	return get_subject_base_service(achievement_indicator, indicator, topic_or_subject_id, dt, principal_service)
	# else:
	# 	raise IndicatorKernelException('Indicator is not based on topic, not supported yet.')
	pass
