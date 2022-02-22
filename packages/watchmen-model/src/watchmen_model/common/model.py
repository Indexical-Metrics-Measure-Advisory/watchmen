from copy import deepcopy
from typing import Any, Dict


class DataModel:
	def __init__(self, **data: Any):
		for key, value in data.items():
			self.__setattr__(key, value)

	def __setattr__(self, name, value):
		self.__dict__[name] = value

	def __getattr__(self, name) -> Any:
		# to avoid property not found
		return self.__dict__.get(name)

	def to_dict(self) -> Dict[str, Any]:
		return deepcopy(self.__dict__)


class SettingsModel(DataModel):
	pass
