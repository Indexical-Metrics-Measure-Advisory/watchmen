from typing import Any, List

from watchmen_reactor.common import ReactorException
from watchmen_utilities import ArrayHelper
from .variables import PipelineVariables


def get_value_from_pipeline_variables(
		variables: PipelineVariables, name: str, names: List[str]
) -> Any:
	data = variables.find_from_current_data(names[0])
	if data is None:
		return None

	remains_count: int = len(names) - 1
	current_index: int = 1
	while current_index <= remains_count:
		if isinstance(data, dict):
			data = data.get(names[current_index])
		elif isinstance(data, list):
			data = ArrayHelper(data) \
				.map(lambda x: x.get(names[current_index])) \
				.flatten().to_list()
		else:
			# cannot retrieve value from plain type variable
			raise ReactorException(f'Cannot retrieve[key={name}, current={names[current_index]}] from [{data}].')

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
