from typing import List, Union

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_model.admin import Topic
from watchmen_model.console import Subject
from watchmen_model.indicator import AchievementIndicator, IndicatorCriteria, IndicatorCriteriaOnExpression, Inspection
from watchmen_utilities import ArrayHelper, get_current_time_in_seconds, is_blank


# noinspection PyUnusedLocal
def redress_inspection(
		inspection: Inspection, topic_or_subject: Union[Topic, Subject],
		principal_service: PrincipalService) -> Inspection:
	clone_inspection = Inspection(
		**inspection.to_dict(),
		criteria=ArrayHelper(inspection.criteria).map(lambda x: x.to_dict()).to_list()
	)
	if isinstance(topic_or_subject, Topic):
		redress_inspection_on_topic(clone_inspection)
	elif isinstance(topic_or_subject, Subject):
		redress_inspection_on_subject(clone_inspection)
	else:
		raise IndicatorKernelException(f'Source[{topic_or_subject}] of criteria is unsupported.')
	return clone_inspection


# noinspection PyUnusedLocal
def redress_achievement_indicator(
		achievement_indicator: AchievementIndicator, topic_or_subject: Union[Topic, Subject],
		principal_service: PrincipalService) -> AchievementIndicator:
	clone_achievement_indicator = AchievementIndicator(
		**achievement_indicator.to_dict(),
		criteria=ArrayHelper(achievement_indicator.criteria).map(lambda x: x.to_dict()).to_list()
	)
	if isinstance(topic_or_subject, Topic):
		redress_achievement_indicator_on_topic(clone_achievement_indicator)
	elif isinstance(topic_or_subject, Subject):
		redress_achievement_indicator_on_subject(clone_achievement_indicator)
	else:
		raise IndicatorKernelException(f'Source[{topic_or_subject}] of criteria is unsupported.')
	return clone_achievement_indicator


def redress_expression(criteria: IndicatorCriteriaOnExpression) -> List[IndicatorCriteriaOnExpression]:
	value = criteria.value
	if is_blank(value):
		return [criteria]
	now = get_current_time_in_seconds()
	value = value.replace('{&year}', f'{now.year}').replace('{&month}', f'{now.month}')
	criteria.value = value
	return [criteria]


def redress_single_criteria(criteria: IndicatorCriteria) -> List[IndicatorCriteria]:
	if isinstance(criteria, IndicatorCriteriaOnExpression):
		return redress_expression(criteria)
	else:
		return [criteria]


def redress_inspection_on_topic(inspection: Inspection):
	inspection.criteria = ArrayHelper(inspection.criteria).map(redress_single_criteria).flatten().to_list()


def redress_inspection_on_subject(inspection: Inspection):
	inspection.criteria = ArrayHelper(inspection.criteria).map(redress_single_criteria).flatten().to_list()


def redress_achievement_indicator_on_topic(achievement_indicator: AchievementIndicator):
	achievement_indicator.criteria = ArrayHelper(achievement_indicator.criteria) \
		.map(redress_single_criteria) \
		.flatten() \
		.to_list()


def redress_achievement_indicator_on_subject(achievement_indicator: AchievementIndicator):
	achievement_indicator.criteria = ArrayHelper(achievement_indicator.criteria) \
		.map(redress_single_criteria) \
		.flatten() \
		.to_list()
