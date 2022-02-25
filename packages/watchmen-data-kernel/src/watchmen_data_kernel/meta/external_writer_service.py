from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.cache import CacheService
from watchmen_data_kernel.common import DataKernelException
from watchmen_data_kernel.external_writer import find_external_writer_create, register_external_writer_creator
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.system import ExternalWriterService as ExternalWriterStorageService
from watchmen_model.common import ExternalWriterId
from watchmen_model.system import ExternalWriter


def register_external_writer(external_writer: ExternalWriter) -> None:
	create = find_external_writer_create(external_writer.type)
	if create is None:
		raise DataKernelException(f'Creator not found for external writer[{external_writer.dict()}].')
	register_external_writer_creator(external_writer.writerCode, create())


class ExternalWriterService:
	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service

	def find_by_id(self, writer_id: ExternalWriterId) -> Optional[ExternalWriter]:
		external_writer = CacheService.external_writer().get(writer_id)
		if external_writer is not None:
			if external_writer.tenantId != self.principalService.get_tenant_id():
				raise DataKernelException(
					f'External writer[id={writer_id}] not belongs to '
					f'current tenant[id={self.principalService.get_tenant_id()}].')
			register_external_writer(external_writer)
			return external_writer

		storage_service = ExternalWriterStorageService(
			ask_meta_storage(), ask_snowflake_generator(), self.principalService)
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
