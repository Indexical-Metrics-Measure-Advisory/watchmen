from abc import abstractmethod
from logging import getLogger
from typing import Any, Callable, Dict, Optional

from watchmen_model.common import DataModel
from watchmen_reactor.common import ReactorException

logger = getLogger(__name__)


class ExternalWriterParams(DataModel):
	pat: Optional[str] = None
	url: Optional[str] = None
	event_code: Optional[str] = None
	current_data: Optional[Dict[str, Any]] = None
	previous_data: Optional[Dict[str, Any]] = None
	variables: Optional[Dict[str, Any]] = None


class ExternalWriter:
	def __init__(self, code: str):
		self.code = code

	def get_code(self) -> str:
		"""
		code should be same as configured
		"""
		return self.code

	@abstractmethod
	def run(self, params: ExternalWriterParams) -> bool:
		pass


CreateExternalWriter = Callable[[], ExternalWriter]


class ExternalWriterRegistry:
	creators: Dict[str, CreateExternalWriter] = {}

	def register(self, code: str, create_writer: CreateExternalWriter) -> Optional[CreateExternalWriter]:
		original = self.creators.get(code)
		self.creators[code] = create_writer
		logger.warning(f'External writer[{code}] is replaced.')
		return original

	def is_registered(self, code) -> bool:
		return code in self.creators

	def ask_writer(self, code: str) -> CreateExternalWriter:
		create = self.creators.get(code)
		if create is None:
			raise ReactorException(f'Creator not found for external writer[{code}].')
		return create


external_writer_registry = ExternalWriterRegistry()


def register_external_writer_creator(code: str, create_writer: CreateExternalWriter) -> None:
	"""
	register writer on startup
	"""
	external_writer_registry.register(code, create_writer)


def is_external_writer_creator_registered(code: str) -> bool:
	return external_writer_registry.is_registered(code)


def ask_external_writer_creator(code: str) -> CreateExternalWriter:
	return external_writer_registry.ask_writer(code)
