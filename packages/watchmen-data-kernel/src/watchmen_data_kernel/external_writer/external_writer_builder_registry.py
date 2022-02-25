from typing import Callable, Dict, Optional

from watchmen_model.system import ExternalWriterType
from .external_writer_registry import BuildExternalWriter

CreateExternalWriterBuilder = Callable[[], BuildExternalWriter]


class ExternalWriterBuilderRegistry:
	creators: Dict[ExternalWriterType, CreateExternalWriterBuilder] = {}

	def register(self, writer_type: ExternalWriterType, creator_create: CreateExternalWriterBuilder) -> None:
		self.creators[writer_type] = creator_create

	def find(self, writer_type: ExternalWriterType) -> Optional[CreateExternalWriterBuilder]:
		return self.creators.get(writer_type)


external_writer_registry = ExternalWriterBuilderRegistry()


def register_external_writer_create(
		writer_type: ExternalWriterType, creator_create: CreateExternalWriterBuilder) -> None:
	external_writer_registry.register(writer_type, creator_create)


def find_external_writer_create(writer_type: ExternalWriterType) -> Optional[CreateExternalWriterBuilder]:
	return external_writer_registry.find(writer_type)
