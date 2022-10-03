from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any, Callable, Dict, List, Optional, Tuple

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import ask_all_date_formats, DataKernelException
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.common import VariablePredefineFunctions
from watchmen_utilities import ArrayHelper, get_current_time_in_seconds, is_date, month_diff, \
	truncate_time, try_to_decimal, year_diff
from .variables import PipelineVariables


def get_value_from(
		name: str, names: List[str],
		get_first: Callable[[str], Any], is_list: Callable[[List[str]], bool]) -> Any:
	data = get_first(names[0])
	if data is None:
		if is_list(names[:1]):
			return []
		else:
			return None

	remains_count: int = len(names) - 1
	current_index: int = 1
	while current_index <= remains_count:
		current_name = names[current_index]
		if current_name == VariablePredefineFunctions.COUNT:
			if isinstance(data, list) or isinstance(data, dict):
				return len(data)
			else:
				raise DataKernelException(f'Cannot retrieve[key={name}, current={current_name}] from [{data}].')
		elif current_name == VariablePredefineFunctions.LENGTH:
			if isinstance(data, str):
				return len(data)
			elif isinstance(data, int) or isinstance(data, float) or isinstance(data, Decimal):
				return len(str(data))
			else:
				raise DataKernelException(f'Cannot retrieve[key={name}, current={current_name}] from [{data}].')
		elif current_name == VariablePredefineFunctions.SUM:
			if isinstance(data, list):
				def to_decimal(value: Any) -> Decimal:
					if value is None:
						return Decimal(0)
					decimal_value = try_to_decimal(value)
					if decimal_value is None:
						raise DataKernelException(f'Cannot retrieve[key={name}, current={current_name}] from [{data}].')
					else:
						return decimal_value

				return ArrayHelper(data).reduce(lambda sum_value, value: sum_value + to_decimal(value), Decimal(0))
			else:
				raise DataKernelException(f'Cannot retrieve[key={name}, current={current_name}] from [{data}].')
		elif isinstance(data, dict):
			data = data.get(current_name)
		elif isinstance(data, list):
			# when parent is a list, value might be a primitive type or a list
			# for that value should be a list but is none, have to check the type by given function
			# this scenario is existing only on get value from raw trigger data
			# and get value from variables, and this value is read from raw trigger data
			value_is_list = is_list(names[:current_index + 1])

			def get_current_value(parent: Dict[str, Any]) -> Any:
				value = None if parent is None else parent.get(current_name)
				if value is None:
					if value_is_list:
						return []
					else:
						return value
				return value

			data = ArrayHelper(data).map(get_current_value).flatten().to_list()
		else:
			# cannot retrieve value from plain type variable
			raise DataKernelException(f'Cannot retrieve[key={name}, current={current_name}] from [{data}].')

		if data is None:
			# no need to go deeper
			if is_list(names[:current_index + 1]):
				return []
			else:
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
		return value if len(prefix) == 0 else f'{prefix}{value}'

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
		value = get_value_from(name, names, lambda x: previous_data.get(x), variables.is_list_on_trigger)
		return value if len(prefix) == 0 else f'{prefix}{value}'

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


def create_is_list_from_variables(variables: PipelineVariables) -> Callable[[List[str]], bool]:
	def is_list(names: List[str]) -> bool:
		if variables.has(names[0]):
			return variables.is_list_on_variables(names)
		else:
			return variables.is_list_on_trigger(names)

	return is_list


def create_get_from_variables_with_prefix(prefix, name: str) -> Callable[[PipelineVariables, PrincipalService], Any]:
	names = name.strip().split('.')

	# noinspection PyUnusedLocal
	def action(variables: PipelineVariables, principal_service: PrincipalService) -> Any:
		value = get_value_from(
			name, names, create_get_value_from_variables(variables), create_is_list_from_variables(variables))
		return value if len(prefix) == 0 else f'{prefix}{value}'

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
	value = get_value_from(
		variable_name, variable_name.strip().split('.'),
		create_get_value_from_variables(variables), create_is_list_from_variables(variables))
	if isinstance(value, date):
		return True, value, value
	parsed, parsed_date = is_date(value, ask_all_date_formats())
	return parsed, value, parsed_date


# noinspection PyUnusedLocal
def get_value_from_variables(
		variables: PipelineVariables, principal_service: PrincipalService, variable_name: str
) -> Tuple[bool, Any, Any]:
	value = get_value_from(
		variable_name, variable_name.strip().split('.'),
		create_get_value_from_variables(variables), create_is_list_from_variables(variables))
	return True, value, value


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
		raise DataKernelException(f'Constant[{variable_name}] is not supported.')
