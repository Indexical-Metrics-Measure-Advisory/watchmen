from __future__ import annotations

from typing import Any, Dict, Optional

from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.results import DeleteResult, InsertOneResult, UpdateResult

from .document_mongo import MongoDocument


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

	def insert_one(self, document: MongoDocument, data: Dict[str, Any]) -> InsertOneResult:
		return self.collection(document.name).insert_one(data)

	def update_many(self, document: MongoDocument, data: Dict[str, Any], where: Dict[str, Any]) -> UpdateResult:
		return self.collection(document.name).update_many(filter=where, update=data, upsert=False)

	def delete_many(self, document: MongoDocument, where: Dict[str, Any]) -> DeleteResult:
		return self.collection(document.name).delete_many(where)

	def find(
			self, document: MongoDocument,
			projection: Optional[Dict[str, Any]],
			where: Optional[Dict[str, Any]], sort: Optional[Dict[str, int]]):
		if projection is None:
			return self.collection(document.name).find(filter=where, sort=sort)
		else:
			return self.collection(document.name).aggregate([
				{'$match': where},
				{'$sort': sort},
				{'$project': projection}
			])

	def find_distinct_values(
			self, document: MongoDocument, column_name: str, where: Optional[Dict[str, Any]]):
		return self.collection(document.name).distinct(column_name, where)


class MongoEngine:
	def __init__(self, url: str):
		self.url = url

	def connect(self) -> MongoConnection:
		return MongoConnection(self)
