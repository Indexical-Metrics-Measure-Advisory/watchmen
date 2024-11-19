from enum import Enum
from logging import getLogger
from typing import Any, Dict

from pydantic import BaseModel, ConfigDict
from pydantic_settings import BaseSettings
import warnings

logger = getLogger(__name__)


warnings.filterwarnings('ignore', category=UserWarning)


class ExtendedBaseModel(BaseModel):
	model_config = ConfigDict(arbitrary_types_allowed=True,
	                          use_enum_values=True)
	
	def __init__(self, **data: Any):
		super().__init__(**data)
		for key, value in data.items():
			self.__setattr__(key, value)

	def __setattr__(self, name, value):
		self.__dict__[name] = value

	def __getattr__(self, name) -> Any:
		# to avoid property not found
		return self.__dict__.get(name)

	def to_dict(self) -> Dict[str, Any]:
		return self.dict()
	
	def model_dump(self, **kwargs) -> dict[str, Any]:
		return super().model_dump(serialize_as_any=True, **kwargs)
	
	def model_dump_json(self, **kwargs) -> str:
		return super().model_dump_json(serialize_as_any=True, **kwargs)
	
	def set_enum_field(self, name: str, value: Any, _class_: Any):
		if isinstance(value, _class_):
			self.__dict__[name] = value
		elif isinstance(value, (str, int)):
			try:
				self.__dict__[name] = _class_(value)
			except ValueError:
				raise ValueError(
					f"Invalid value for {name}: {value}. Must be an instance of {_class_} enum.")
		else:
			raise ValueError(
				f"Invalid value for {name}: {value}. Must be an instance of {_class_} enum.")


class ExtendedBaseSettings(BaseSettings):
	class Config:
		# secrets_dir = '/var/run'
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True
		extra = 'ignore'
