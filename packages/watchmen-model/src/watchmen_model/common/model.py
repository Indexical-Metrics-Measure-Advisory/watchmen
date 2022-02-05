from typing import Any


class DataModel:
	def __init__(self, **data):
		for key, value in data.items():
			self.__setattr__(key, value)

	def __setattr__(self, name, value):
		self.__dict__[name] = value

	def __getattr__(self, name) -> Any:
		# to avoid property not found
		return self.__dict__.get(name)


class SettingsModel(DataModel):
	pass
