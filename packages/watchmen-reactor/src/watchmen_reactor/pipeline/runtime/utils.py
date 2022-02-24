from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Callable, List, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import Factor, FactorType
from watchmen_model.common import VariablePredefineFunctions
from watchmen_reactor.common import ask_all_date_formats, ask_time_formats, ReactorException
from watchmen_utilities import ArrayHelper, get_current_time_in_seconds, is_blank, is_date, is_decimal, is_time, \
	month_diff, \
	truncate_time, \
	try_to_decimal, year_diff
from .variables import PipelineVariables


def get_value_from(name: str, names: List[str], get_first: Callable[[str], Any]) -> Any:
	data = get_first(names[0])
	if data is None:
		return None

	remains_count: int = len(names) - 1
	current_index: int = 1
	while current_index <= remains_count:
		current_name = names[current_index]
		if current_name == VariablePredefineFunctions.COUNT:
			if isinstance(data, list) or isinstance(data, dict):
				return len(data)
			else:
				raise ReactorException(f'Cannot retrieve[key={name}, current={current_name}] from [{data}].')
		elif current_name == VariablePredefineFunctions.LENGTH:
			if isinstance(data, str):
				return len(data)
			elif isinstance(data, int) or isinstance(data, float) or isinstance(data, Decimal):
				return len(str(data))
			else:
				raise ReactorException(f'Cannot retrieve[key={name}, current={current_name}] from [{data}].')
		elif current_name == VariablePredefineFunctions.SUM:
			if isinstance(data, list):
				def to_decimal(value: Any) -> Decimal:
					if value is None:
						return Decimal(0)
					decimal_value = try_to_decimal(value)
					if decimal_value is None:
						raise ReactorException(f'Cannot retrieve[key={name}, current={current_name}] from [{data}].')
					else:
						return decimal_value

				return ArrayHelper(data).reduce(lambda sum_value, value: sum_value + to_decimal(value), Decimal(0))
			else:
				raise ReactorException(f'Cannot retrieve[key={name}, current={current_name}] from [{data}].')
		elif isinstance(data, dict):
			data = data.get(current_name)
		elif isinstance(data, list):
			data = ArrayHelper(data) \
				.map(lambda x: x.get(current_name)) \
				.flatten().to_list()
		else:
			# cannot retrieve value from plain type variable
			raise ReactorException(f'Cannot retrieve[key={name}, current={current_name}] from [{data}].')

		if data is None:
			# no need to go deeper
			return None
		elif isinstance(data, list) and len(data) == 0:
			# no need to go deeper
			return []

		# next loop
		current_index = current_index + 1
	# reaches target
	return data


# noinspection PyUnusedLocal
def always_none(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
	return None


def create_static_str(value: str) -> Callable[[PipelineVariables, PrincipalService], Any]:
	# noinspection PyUnusedLocal
	def get_static_str(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		return value

	return get_static_str


def create_snowflake_generator(prefix: str) -> Callable[[PipelineVariables, PrincipalService], Any]:
	# noinspection PyUnusedLocal
	def action(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		value = ask_snowflake_generator().next_id()
		return value if is_blank(prefix) else f'{prefix}{value}'

	return action


def create_previous_trigger_data() -> Callable[[PipelineVariables, PrincipalService], Any]:
	# noinspection PyUnusedLocal
	def action(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		return variables.get_previous_trigger_data()

	return action


def create_from_previous_trigger_data(prefix, name: str) -> Callable[[PipelineVariables, PrincipalService], Any]:
	names = name.strip().split('.')

	# noinspection PyUnusedLocal
	def action(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		previous_data = variables.get_previous_trigger_data()
		value = get_value_from(name, names, lambda x: previous_data.get(x))
		return value if is_blank(prefix) else f'{prefix}{value}'

	return action


def create_get_value_from_variables(variables: PipelineVariables) -> Callable[[str], Any]:
	"""
	recursive is not supported
	"""

	def get_value(name: str) -> Any:
		if variables.has(name):
			return variables.find(name)
		else:
			return variables.find_from_current_data(name)

	return get_value


def create_get_from_variables_with_prefix(prefix, name: str) -> Callable[[PipelineVariables, PrincipalService], Any]:
	names = name.strip().split('.')

	# noinspection PyUnusedLocal
	def action(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		value = get_value_from(name, names, create_get_value_from_variables(variables))
		return value if is_blank(prefix) else f'{prefix}{value}'

	return action


def test_date(variable_name: str) -> Tuple[bool, Optional[date]]:
	if variable_name == VariablePredefineFunctions.NOW:
		return True, get_current_time_in_seconds()
	else:
		return is_date(variable_name, ask_all_date_formats())


# noinspection PyUnusedLocal
def get_date_from_variables(
		variables: PipelineVariables, principal_service: PrincipalService, variable_name: str
) -> Tuple[bool, Any, date]:
	value = get_value_from(variable_name, variable_name.strip().split('.'), create_get_value_from_variables(variables))
	parsed, parsed_date = is_date(value, ask_all_date_formats())
	return parsed, value, parsed_date


def compute_date_diff(
		function: VariablePredefineFunctions, end_date: date, start_date: date, variable_name: str
) -> int:
	if function == VariablePredefineFunctions.YEAR_DIFF:
		return year_diff(end_date, start_date)
	elif function == VariablePredefineFunctions.MONTH_DIFF:
		return month_diff(end_date, start_date)
	elif function == VariablePredefineFunctions.DAY_DIFF:
		return (truncate_time(end_date) - truncate_time(start_date)).days
	else:
		raise ReactorException(f'Constant[{variable_name}] is not supported.')


def cast_value_for_factor(value: Any, factor: Factor) -> Any:
	factor_type = factor.type
	if factor_type in [
		FactorType.SEQUENCE, FactorType.NUMBER, FactorType.UNSIGNED, FactorType.FLOOR, FactorType.RESIDENTIAL_AREA,
		FactorType.AGE, FactorType.BIZ_SCALE
	]:
		parsed, decimal_value = is_decimal(value)
		if parsed:
			return decimal_value
		else:
			raise ReactorException(
				f'Value[{value}] is incompatible with factor[name={factor.name}, type={factor_type}].')
	elif factor_type == FactorType.TEXT:
		if isinstance(value, str):
			return value
		elif isinstance(value, (int, float, Decimal, bool, date, time)):
			return str(value)
		else:
			raise ReactorException(
				f'Value[{value}, type={type(value)}] is incompatible with '
				f'factor[name={factor.name}, type={factor_type}].')
	elif factor_type in [
		FactorType.ADDRESS, FactorType.ROAD, FactorType.COMMUNITY, FactorType.EMAIL, FactorType.PHONE,
		FactorType.MOBILE, FactorType.FAX, FactorType.OCCUPATION, FactorType.ID_NO
	]:
		if isinstance(value, str):
			return value
		elif isinstance(value, (int, float, Decimal)):
			return str(value)
		else:
			raise ReactorException(
				f'Value[{value}, type={type(value)}] is incompatible with '
				f'factor[name={factor.name}, type={factor_type}].')
	# noinspection PyPep8
	elif factor_type in [
		FactorType.CONTINENT, FactorType.REGION, FactorType.COUNTRY, FactorType.PROVINCE, FactorType.CITY,
		FactorType.DISTRICT, FactorType.RESIDENCE_TYPE, FactorType.GENDER, FactorType.RELIGION, FactorType.NATIONALITY,
		FactorType.BIZ_TRADE, FactorType.ENUM
	]:
		if isinstance(value, str):
			return value
		elif isinstance(value, (int, Decimal)):
			return str(value)
		else:
			raise ReactorException(
				f'Value[{value}, type={type(value)}] is incompatible with '
				f'factor[name={factor.name}, type={factor_type}].')
	elif factor_type == FactorType.DATETIME:
		parsed, date_value = is_date(value, ask_all_date_formats())
		if parsed:
			return date_value
		else:
			raise ReactorException(
				f'Value[{value}, type={type(value)}] is incompatible with '
				f'factor[name={factor.name}, type={factor_type}].')
	elif factor_type in [
		FactorType.DATE, FactorType.DATE_OF_BIRTH
	]:
		parsed, date_value = is_date(value, ask_all_date_formats())
		if parsed:
			if isinstance(date_value, datetime):
				return date_value.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
			else:
				return date_value
		else:
			raise ReactorException(
				f'Value[{value}, type={type(value)}] is incompatible with '
				f'factor[name={factor.name}, type={factor_type}].')
	elif factor_type == FactorType.TIME:
		parsed, time_value = is_time(value, ask_time_formats())
		if parsed:
			return time_value
		else:
			raise ReactorException(
				f'Value[{value}, type={type(value)}] is incompatible with '
				f'factor[name={factor.name}, type={factor_type}].')
	else:
		raise ReactorException(f'Factor type[{factor_type}] is not supported.')

# elif factor_type == FactorType.FULL_DATETIME:
# elif factor_type == FactorType.YEAR:
# elif factor_type == FactorType.HALF_YEAR:
# elif factor_type == FactorType.QUARTER:
# elif factor_type == FactorType.MONTH:
# elif factor_type == FactorType.HALF_MONTH:
# elif factor_type == FactorType.TEN_DAYS:
# elif factor_type == FactorType.WEEK_OF_YEAR:
# elif factor_type == FactorType.WEEK_OF_MONTH:
# elif factor_type == FactorType.HALF_WEEK:
# elif factor_type == FactorType.DAY_OF_MONTH:
# elif factor_type == FactorType.DAY_OF_WEEK:
# elif factor_type == FactorType.DAY_KIND:
# elif factor_type == FactorType.HOUR:
# elif factor_type == FactorType.HOUR_KIND:
# elif factor_type == FactorType.MINUTE:
# elif factor_type == FactorType.SECOND:
# elif factor_type == FactorType.MILLISECOND:
# elif factor_type == FactorType.AM_PM:
# elif factor_type == FactorType.BOOLEAN:
