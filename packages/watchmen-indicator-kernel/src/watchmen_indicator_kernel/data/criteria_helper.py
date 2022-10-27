from datetime import datetime
from re import match
from typing import Callable, List, Optional, Tuple, Union

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_model.admin import Topic
from watchmen_model.console import Subject
from watchmen_model.indicator import AchievementIndicator, IndicatorCriteria, IndicatorCriteriaOnExpression, \
	IndicatorCriteriaOperator, Inspection
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


def redress_year(
		criteria: IndicatorCriteriaOnExpression, now: datetime
) -> Tuple[bool, Optional[List[IndicatorCriteriaOnExpression]]]:
	"""
	:return:
		first boolean: true when be processed, otherwise false
		second array: expression list when be processed, otherwise none
	"""
	if criteria.value.strip() in ['{&year}', '{&y}']:
		# explicitly given year
		criteria.value = f'{now.year}'
		return True, [criteria]
	else:
		return False, None


def redress_month(
		criteria: IndicatorCriteriaOnExpression, now: datetime
) -> Tuple[bool, Optional[List[IndicatorCriteriaOnExpression]]]:
	"""
	:return:
		first boolean: true when be processed, otherwise false
		second array: expression list when be processed, otherwise none
	"""
	if criteria.value.strip() in ['{&month}', '{&m}']:
		# explicitly given year
		criteria.value = f'{now.month}'
		return True, [criteria]
	else:
		return False, None


def redress_year_to_end(
		criteria: IndicatorCriteriaOnExpression, now: datetime
) -> Tuple[bool, Optional[List[IndicatorCriteriaOnExpression]]]:
	"""
	:return:
		first boolean: true when be processed, otherwise false
		second array: expression list when be processed, otherwise none
	"""
	if criteria.value.strip() in ['{&yearToDate}', '{&y2d}']:
		# year to end aka this year
		criteria.value = f'{now.year}'
		return True, [criteria]
	else:
		return False, None


def redress_month_to_end(
		criteria: IndicatorCriteriaOnExpression, now: datetime
) -> Tuple[bool, Optional[List[IndicatorCriteriaOnExpression]]]:
	if criteria.value.strip() in ['{&monthToDate}', '{&m2d}']:
		# month to end aka this year & month
		return True, [
			IndicatorCriteriaOnExpression(**criteria.to_dict(), value=f'{now.year}'),
			IndicatorCriteriaOnExpression(**criteria.to_dict(), value=f'{now.month}'),
		]
	else:
		return False, None


def redress_last_years(
		criteria: IndicatorCriteriaOnExpression, now: datetime
) -> Tuple[bool, Optional[List[IndicatorCriteriaOnExpression]]]:
	m = match(r'^{&last(\d+)Year(s)?((OnMonth)?|(OnDay)?)}$', criteria.value.strip())
	if m is None:
		m = match(r'^{&l(\d+)(y)((m)?|(d)?)}$', criteria.value.strip())
	if m is not None:
		years = int(m.group(1))
		unit = m.group(3)
		if unit == 'OnMonth' or unit == 'm':
			# set to start of this month, and back n years, and add 1 month
			# totally n years, last month might be incomplete
			return True, [
				IndicatorCriteriaOnExpression(
					**criteria.to_dict(), operator=IndicatorCriteriaOperator.MORE_EQUALS,
					value=f'{{&moveDate(&now, D1Y-{years}M+1)h0m0s0}}'),
				IndicatorCriteriaOnExpression(
					**criteria.to_dict(), operator=IndicatorCriteriaOperator.LESS_EQUALS,
					value='{&moveDate(&now, h23m59s59)}'),
			]
		elif unit == 'OnDay' or unit == 'd':
			# exactly n years
			return True, [
				IndicatorCriteriaOnExpression(
					**criteria.to_dict(), operator=IndicatorCriteriaOperator.MORE_EQUALS,
					value=f'{{&moveDate(&now, Y-{years}h0m0s0)}}'),
				IndicatorCriteriaOnExpression(
					**criteria.to_dict(), operator=IndicatorCriteriaOperator.LESS_EQUALS,
					value='{&moveDate(&now, h23m59s59)}'),
			]
		else:
			# set to 1st, Jan., and back n - 1 years
			# equals last n - 1 years and this year
			return True, [
				IndicatorCriteriaOnExpression(
					**criteria.to_dict(), operator=IndicatorCriteriaOperator.MORE_EQUALS,
					value=f'{{&moveDate(&now, M1D1Y-{years - 1}h0m0s0)}}'),
				IndicatorCriteriaOnExpression(
					**criteria.to_dict(), operator=IndicatorCriteriaOperator.LESS_EQUALS,
					value='{&moveDate(&now, h23m59s59)}'),
			]
	return False, None


# noinspection PyUnusedLocal
def redress_last_months(
		criteria: IndicatorCriteriaOnExpression, now: datetime
) -> Tuple[bool, Optional[List[IndicatorCriteriaOnExpression]]]:
	m = match(r'^{&last(\d+)Month(s)?(OnDay)?}$', criteria.value.strip())
	if m is None:
		m = match(r'^{&l(\d+)(m)(d)?}$', criteria.value.strip())
	if m is not None:
		months = m.group(1)
		unit = m.group(3)
		if unit == 'OnDay' or unit == 'd':
			# exactly n months
			return True, [
				IndicatorCriteriaOnExpression(
					**criteria.to_dict(), operator=IndicatorCriteriaOperator.MORE_EQUALS,
					value=f'{{&moveDate(&now, M-{months}h0m0s0)}}'),
				IndicatorCriteriaOnExpression(
					**criteria.to_dict(), operator=IndicatorCriteriaOperator.LESS_EQUALS,
					value='{&moveDate(&now, h23m59s59)}'),
			]
		else:
			# set to start of this month, and back n - 1 months
			# equals last n - 1 month, and this month,
			# totally n months, last month might be incomplete
			return True, [
				IndicatorCriteriaOnExpression(
					**criteria.to_dict(), operator=IndicatorCriteriaOperator.MORE_EQUALS,
					value=f'{{&moveDate(&now, D1M-{months - 1})h0m0s0}}'),
				IndicatorCriteriaOnExpression(
					**criteria.to_dict(), operator=IndicatorCriteriaOperator.LESS_EQUALS,
					value='{&moveDate(&now, h23m59s59)}'),
			]

	return False, None


def redress_expression(criteria: IndicatorCriteriaOnExpression) -> List[IndicatorCriteriaOnExpression]:
	value = criteria.value
	if is_blank(value):
		return [criteria]
	now = get_current_time_in_seconds()

	def process(
			param: Tuple[bool, Optional[List[IndicatorCriteriaOnExpression]]],
			func: Callable[
				[IndicatorCriteriaOnExpression, datetime], Tuple[bool, Optional[List[IndicatorCriteriaOnExpression]]]]
	) -> Tuple[bool, Optional[List[IndicatorCriteriaOnExpression]]]:
		return param if param[0] else func(param[1][0], now)

	return ArrayHelper([
		redress_year, redress_month,
		redress_year_to_end, redress_month_to_end,
		redress_last_years, redress_last_months
	]).reduce(lambda x, y: process(x, y), (False, [criteria]))[1]


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
