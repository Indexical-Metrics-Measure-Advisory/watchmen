from typing import Any, Dict, List

from watchmen_model.admin import Factor, Topic
from watchmen_utilities import ArrayHelper, is_blank


class FlattenFactor:
	def __init__(self, factor: Factor):
		self.factor = factor
		self.factorName = '' if is_blank(factor.name) else factor.name.strip()
		self.names = self.factorName.split('.')

	def get_factor(self):
		return self.factor

	def get_names(self):
		return self.names

	def flatten(self, root: Dict[str, Any]) -> Any:
		data = root
		value = None
		for name in self.names:
			value = data.get(name)
			if value is None:
				# break and set to root
				root[self.factorName] = None
				return None
			else:
				data = value
		# set to root
		root[self.factorName] = value
		return value


def parse_flatten_factors(topic: Topic) -> List[FlattenFactor]:
	return ArrayHelper(topic.factors).filter(lambda x: x.flatten).map(lambda x: FlattenFactor(x)).to_list()
