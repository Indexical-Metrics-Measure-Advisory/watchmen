from typing import TypeVar, Callable

from watchmen_auth import PrincipalService
from watchmen_storage import SnowflakeGenerator, TransactionalStorageSPI

T = TypeVar('T')
ServiceFactory = Callable[[TransactionalStorageSPI, SnowflakeGenerator, PrincipalService], T]

def get_service(storage: TransactionalStorageSPI,
                snowflake_generator: SnowflakeGenerator,
                principal_service: PrincipalService,
                service_factory: ServiceFactory[T]) -> T:
    return service_factory(storage, snowflake_generator, principal_service)
