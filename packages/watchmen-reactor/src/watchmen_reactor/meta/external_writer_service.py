from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.system import ExternalWriterService as ExternalWriterStroageService
from watchmen_model.common import ExternalWriterId
from watchmen_model.system import ExternalWriter
from watchmen_reactor.cache import CacheService


class ExternalWriterService:
	def __init__(self, principal_service: PrincipalService):
		self.principal_service = principal_service

	def find_by_id(self, writer_id: ExternalWriterId) -> Optional[ExternalWriter]:
		external_writer = CacheService.external_writer().get(writer_id)
		if external_writer is not None:
			return external_writer

		storage_service = ExternalWriterStroageService(
			ask_meta_storage(), ask_snowflake_generator(), self.principal_service)
		storage_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			external_writer: ExternalWriter = storage_service.find_by_id(writer_id)
			if external_writer is None:
				return None

			CacheService.external_writer().put(external_writer)
			return external_writer
		finally:
			storage_service.close_transaction()
