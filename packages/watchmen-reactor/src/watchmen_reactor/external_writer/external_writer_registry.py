from typing import Callable, Dict, Optional

from watchmen_model.system import ExternalWriterType
from watchmen_reactor.common import ask_elastic_search_external_writer_enabled, ask_standard_external_writer_enabled, \
	ReactorException
from .external_writer import CreateExternalWriter

ExternalWriterCreatorCreator = Callable[[], CreateExternalWriter]


class ExternalWriterRegistryByType:
	creators: Dict[ExternalWriterType, ExternalWriterCreatorCreator] = {}

	def register(self, writer_type: ExternalWriterType, creator_create: ExternalWriterCreatorCreator) -> None:
		self.creators[writer_type] = creator_create

	def find(self, writer_type: ExternalWriterType) -> Optional[ExternalWriterCreatorCreator]:
		if writer_type == ExternalWriterType.STANDARD_WRITER:
			return self.find_standard()
		elif writer_type == ExternalWriterType.ELASTIC_SEARCH_WRITER:
			return self.find_elastic_search()
		return self.creators.get(writer_type)

	# noinspection PyMethodMayBeStatic
	def find_standard(self) -> ExternalWriterCreatorCreator:
		if ask_standard_external_writer_enabled():
			from .standard_writer import register_standard_writer
			return register_standard_writer
		else:
			raise ReactorException(f'Standard external writer is turned off now.')

	# noinspection PyMethodMayBeStatic
	def find_elastic_search(self) -> ExternalWriterCreatorCreator:
		if ask_elastic_search_external_writer_enabled():
			from .elastic_search_writer import register_elastic_search_writer
			return register_elastic_search_writer
		else:
			raise ReactorException(f'Elastic search external writer is turned off now.')


external_writer_registry = ExternalWriterRegistryByType()


def register_external_writer_create(
		writer_type: ExternalWriterType, creator_create: ExternalWriterCreatorCreator) -> None:
	external_writer_registry.register(writer_type, creator_create)


def find_external_writer_create(writer_type: ExternalWriterType) -> Optional[ExternalWriterCreatorCreator]:
	return external_writer_registry.find(writer_type)
