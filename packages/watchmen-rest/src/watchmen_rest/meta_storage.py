from watchmen_storage import TransactionalStorageSPI
from .exceptions import InitialRestAppException
from .rest_settings import RestSettings


def build_mysql_storage(settings: RestSettings) -> TransactionalStorageSPI:
	from watchmen_storage_mysql import StorageMySQLConfiguration
	return StorageMySQLConfiguration.config() \
		.host(settings.META_STORAGE_HOST, settings.META_STORAGE_PORT) \
		.account(settings.META_STORAGE_USER_NAME, settings.META_STORAGE_PASSWORD) \
		.schema(settings.META_STORAGE_NAME) \
		.echo(settings.META_STORAGE_ECHO) \
		.build()


def build_meta_storage(settings: RestSettings) -> TransactionalStorageSPI:
	storage_type = settings.META_STORAGE_TYPE
	if storage_type == 'mysql':
		return build_mysql_storage(settings)

	raise InitialRestAppException(f'Meta storage type[{storage_type}] is not supported yet.')
