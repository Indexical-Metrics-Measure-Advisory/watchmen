from __future__ import annotations

from decimal import Decimal
from typing import Any, Callable, List

from watchmen_auth import PrincipalService
from watchmen_model.common import VariablePredefineFunctions
from watchmen_reactor.common import ReactorException
from watchmen_utilities import ArrayHelper, try_to_decimal
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

				return ArrayHelper(data).reduce(lambda sum, value: sum + to_decimal(value), Decimal(0))
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
