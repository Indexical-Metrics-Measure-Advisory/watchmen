from typing import Any, Callable, Hashable, Optional, Union, ValuesView

from cacheout import Cache

from watchmen_data_kernel.common import ask_cache_enabled


class InternalCache:
	def __init__(self, cache: Callable[[], Cache]):
		if ask_cache_enabled():
			self.cache = cache()

	def put(self, key: Hashable, value: Any, ttl: Optional[Union[int, float]] = None) -> Optional[Any]:
		if not ask_cache_enabled():
			return None

		existing: Optional[Any] = self.cache.get(key)
		self.cache.set(key, value, ttl)
		return existing

	def get(self, key: Hashable, default_value: Optional[Any] = None) -> Optional[Any]:
		if not ask_cache_enabled():
			return None

		existing: Optional[Any] = self.cache.get(key)
		return existing if existing is not None else default_value

	def remove(self, key: Hashable) -> Optional[Any]:
		if not ask_cache_enabled():
			return None

		existing: Optional[Any] = self.cache.get(key)
		self.cache.delete(key)
		return existing

	def values(self) -> ValuesView:
		return self.cache.values()

	def clear(self) -> None:
		if ask_cache_enabled():
			self.cache.clear()
