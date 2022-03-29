from __future__ import annotations

from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database


class MongoConnection:
	def __init__(self, engine: MongoEngine):
		self.engine = engine
		self.client = MongoClient(engine.url, document_class=dict, tz_aware=False, connect=False)

	def begin(self) -> None:
		pass

	def commit(self) -> None:
		pass

	def rollback(self) -> None:
		pass

	def close(self) -> None:
		self.client.close()

	def database(self) -> Database:
		return self.client.get_default_database()

	def collection(self, name: str) -> Collection:
		return self.database()[name]

	def drop_collection(self, name: str) -> None:
		self.collection(name).drop()


class MongoEngine:
	def __init__(self, url: str):
		self.url = url

	def connect(self) -> MongoConnection:
		return MongoConnection(self)
