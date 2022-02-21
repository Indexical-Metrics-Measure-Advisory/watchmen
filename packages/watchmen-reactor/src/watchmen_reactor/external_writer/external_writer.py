from abc import abstractmethod
from logging import getLogger
from typing import Any, Callable, Dict, Optional

from watchmen_model.common import DataModel
from watchmen_reactor.common import ReactorException

logger = getLogger(__name__)


class ExternalWriterParams(DataModel):
	event_code: Optional[str] = None
	current_data: Optional[Dict[str, Any]] = None
	previous_data: Optional[Dict[str, Any]] = None
	variables: Optional[Dict[str, Any]] = None


class ExternalWriter:
	@abstractmethod
	def get_code(self) -> str:
		"""
		code should be same as configured
		"""
		pass

	@abstractmethod
	def run(self, params: ExternalWriterParams) -> bool:
		pass


CreateExternalWriter = Callable[[Dict[str, Any]], ExternalWriter]


class ExternalWriterRegistry:
	creators: Dict[str, CreateExternalWriter] = {}

	def register(self, code: str, create_writer: CreateExternalWriter) -> Optional[CreateExternalWriter]:
		original = self.creators.get(code)
		self.creators[code] = create_writer
		logger.warning(f'External writer[{code}] is replaced.')
		return original

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


def ask_external_writer_creator(code: str) -> CreateExternalWriter:
	return external_writer_registry.ask_writer(code)


def ask_external_writer(code: str, params: Dict[str, Any]) -> ExternalWriter:
	return external_writer_registry.ask_writer(code)(params)
