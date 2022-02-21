from typing import Callable, Dict, Optional

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.system import ExternalWriterService as ExternalWriterStorageService
from watchmen_model.common import ExternalWriterId
from watchmen_model.system import ExternalWriter, ExternalWriterType
from watchmen_reactor.cache import CacheService
from watchmen_reactor.common import ReactorException
from watchmen_reactor.external_writer import CreateExternalWriter, register_elastic_search_writer, \
	register_external_writer_creator, \
	register_standard_writer

ExternalWriterCreatorCreator = Callable[[], CreateExternalWriter]


class ExternalWriterRegistryByType:
	creators: Dict[ExternalWriterType, ExternalWriterCreatorCreator] = {}

	def register(self, writer_type: ExternalWriterType, creator_create: ExternalWriterCreatorCreator) -> None:
		self.creators[writer_type] = creator_create

	def find(self, writer_type: ExternalWriterType) -> Optional[ExternalWriterCreatorCreator]:
		return self.creators.get(writer_type)


external_writer_registry = ExternalWriterRegistryByType()
# register standard external writer
external_writer_registry.register(ExternalWriterType.STANDARD_WRITER, register_standard_writer)
# register elastic external writer
external_writer_registry.register(ExternalWriterType.ELASTIC_SEARCH_WRITER, register_elastic_search_writer)


def register_external_writer(external_writer: ExternalWriter) -> None:
	create = external_writer_registry.find(external_writer.type)
	if create is None:
		raise ReactorException(f'Creator not found for external writer[{external_writer.dict()}].')
	register_external_writer_creator(external_writer.writerCode, create())


class ExternalWriterService:
	def __init__(self, principal_service: PrincipalService):
		self.principal_service = principal_service

	def find_by_id(self, writer_id: ExternalWriterId) -> Optional[ExternalWriter]:
		external_writer = CacheService.external_writer().get(writer_id)
		if external_writer is not None:
			register_external_writer(external_writer)
			return external_writer

		storage_service = ExternalWriterStorageService(
			ask_meta_storage(), ask_snowflake_generator(), self.principal_service)
		storage_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			external_writer: ExternalWriter = storage_service.find_by_id(writer_id)
			if external_writer is None:
				return None

			CacheService.external_writer().put(external_writer)
			register_external_writer(external_writer)
			return external_writer
		finally:
			storage_service.close_transaction()
