from copy import deepcopy
from datetime import date, time
from decimal import Decimal
from typing import Any, Dict

from pydantic import BaseModel


def copy_x(x: Any) -> Any:
	if x is None:
		return x
	elif isinstance(x, dict):
		return copy_dict(x)
	elif isinstance(x, list):
		return copy_list(x)
	elif isinstance(x, tuple):
		return copy_tuple(x)
	elif isinstance(x, (str, int, float, Decimal, bool, date, time)):
		return deepcopy(x)
	elif isinstance(x, BaseModel):
		return x.dict()
	elif isinstance(x, DataModel):
		return x.to_dict()
	else:
		raise ValueError(f'X[{x}] cannot be copied.')


def copy_tuple(a_tuple: tuple) -> tuple:
	new_list = []
	for v in a_tuple:
		new_list.append(copy_x(v))
	return tuple(new_list)


def copy_list(a_list: list) -> list:
	new_list = []
	for v in a_list:
		new_list.append(copy_x(v))
	return new_list


def copy_dict(a_dict: dict) -> dict:
	new_dict = {}
	for k, v in a_dict.items():
		new_dict[copy_x(k)] = copy_x(v)
	return new_dict


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
		return copy_dict(self.__dict__)


class SettingsModel(DataModel):
	pass
