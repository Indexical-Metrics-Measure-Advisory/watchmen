from typing import List, Optional

from watchmen_model.common import ExternalWriterId
from watchmen_model.system import ExternalWriter
from .cache_manager import get_external_writer_by_id_cache
from .internal_cache import InternalCache


# noinspection DuplicatedCode
class ExternalWriterCache:
	"""
	external writer cache will not impact other caches
	"""

	def __init__(self):
		self.byIdCache = InternalCache(cache=get_external_writer_by_id_cache)

	def put(self, external_writer: ExternalWriter) -> Optional[ExternalWriter]:
		return self.byIdCache.put(external_writer.writerId, external_writer)

	def get(self, external_writer_id: ExternalWriterId) -> Optional[ExternalWriter]:
		return self.byIdCache.get(external_writer_id)

	def remove(self, external_writer_id: ExternalWriterId) -> Optional[ExternalWriter]:
		return self.byIdCache.remove(external_writer_id)

	def all(self) -> List[ExternalWriter]:
		return list(self.byIdCache.values())

	def clear(self) -> None:
		self.byIdCache.clear()


external_writer_cache = ExternalWriterCache()
