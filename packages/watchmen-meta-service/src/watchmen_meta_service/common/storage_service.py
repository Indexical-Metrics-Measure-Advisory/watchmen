from __future__ import annotations

from datetime import datetime
from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_storage import SnowflakeGenerator, TransactionalStorageSPI
from watchmen_utilities import get_current_time_in_seconds


class StorageService:
	storage: TransactionalStorageSPI
	principal_service: Optional[PrincipalService] = None
	snowflake_generator: Optional[SnowflakeGenerator] = None

	def __init__(self, storage: TransactionalStorageSPI):
		self.storage = storage

	def with_principal_service(self, principal_service: PrincipalService) -> StorageService:
		self.principal_service = principal_service
		return self

	def with_snowflake_generator(self, snowflake_generator: SnowflakeGenerator) -> StorageService:
		self.snowflake_generator = snowflake_generator
		return self

	def begin_transaction(self):
		self.storage.begin()

	def commit_transaction(self):
		self.storage.commit_and_close()

	def rollback_transaction(self):
		self.storage.rollback_and_close()

	def close_transaction(self):
		self.storage.close()

	# noinspection PyMethodMayBeStatic
	def now(self) -> datetime:
		return get_current_time_in_seconds()
