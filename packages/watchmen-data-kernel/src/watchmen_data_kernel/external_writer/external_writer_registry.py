from abc import abstractmethod
from logging import getLogger
from typing import Any, Callable, Dict, Optional

from watchmen_data_kernel.common import DataKernelException
from watchmen_model.common import DataModel

logger = getLogger(__name__)


class ExternalWriterParams(DataModel):
	pat: Optional[str] = None
	url: Optional[str] = None
	eventCode: Optional[str] = None
	currentData: Optional[Dict[str, Any]] = None
	previousData: Optional[Dict[str, Any]] = None
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


BuildExternalWriter = Callable[[str], ExternalWriter]


class ExternalWriterRegistry:
	builders: Dict[str, BuildExternalWriter] = {}

	def register(self, code: str, build_writer: BuildExternalWriter) -> Optional[BuildExternalWriter]:
		original = self.builders.get(code)
		self.builders[code] = build_writer
		if original is not None:
			logger.warning(f'External writer[{code}] is replaced.')
		else:
			logger.info(f'External writer[{code}] is registered.')
		return original

	def is_registered(self, code: str) -> bool:
		return code in self.builders

	def ask_writer(self, code: str) -> BuildExternalWriter:
		create = self.builders.get(code)
		if create is None:
			raise DataKernelException(f'Creator not found for external writer[{code}].')
		return create


external_writer_registry = ExternalWriterRegistry()


def register_external_writer_creator(code: str, create_writer: BuildExternalWriter) -> None:
	"""
	register writer on startup
	"""
	external_writer_registry.register(code, create_writer)


def is_external_writer_creator_registered(code: str) -> bool:
	return external_writer_registry.is_registered(code)


def ask_external_writer_creator(code: str) -> BuildExternalWriter:
	return external_writer_registry.ask_writer(code)
