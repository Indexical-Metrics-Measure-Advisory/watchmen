from __future__ import annotations

from typing import Any, Dict, List

from bson import ObjectId
from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from pymongo.results import DeleteResult, UpdateResult

from .codes_options import ask_codec_options
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

	def insert_one(self, document: MongoDocument, data: Dict[str, Any]) -> None:
		self.collection(document.name).insert_one(data)

	def insert_many(self, document: MongoDocument, data: List[Dict[str, Any]]) -> None:
		self.collection(document.name).insert_many(data)

	def update_by_id(self, document: MongoDocument, data: Dict[str, Any], object_id: str) -> UpdateResult:
		return self.collection(document.name).update_many({'id_': ObjectId(object_id)}, {'$set': data})

	def delete_by_id(self, document: MongoDocument, object_id: str) -> DeleteResult:
		return self.delete_many(document, {'_id': ObjectId(object_id)})

	def delete_many(self, document: MongoDocument, criteria: Dict[str, Any]) -> DeleteResult:
		return self.collection(document.name).delete_many(criteria)

	def find_by_id(self, document: MongoDocument, object_id: str) -> Dict[str, Any]:
		return self.collection(document.name).find_one({'_id': ObjectId(object_id)}, codec_options=ask_codec_options())

	def find_all(self, document: MongoDocument) -> List[Dict[str, Any]]:
		return self.collection(document.name).find({})


class MongoEngine:
	def __init__(self, url: str):
		self.url = url

	def connect(self) -> MongoConnection:
		return MongoConnection(self)
