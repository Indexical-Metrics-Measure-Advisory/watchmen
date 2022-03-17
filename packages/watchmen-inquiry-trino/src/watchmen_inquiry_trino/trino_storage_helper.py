from watchmen_auth import PrincipalService
from .trino_storage import TrinoStorage
from .trino_storage_spi import TrinoStorageSPI


def ask_trino_topic_storage(principal_service: PrincipalService) -> TrinoStorageSPI:
	return TrinoStorage(principal_service)
