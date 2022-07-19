from __future__ import annotations

from typing import Any, Dict, List, Optional, Union

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
		return self.client.get_default_database(codec_options=ask_codec_options())

	def collection(self, name: str) -> Collection:
		return self.database()[name]

	def drop_collection(self, name: str) -> None:
		self.collection(name).drop()

	def insert_one(self, document: MongoDocument, data: Dict[str, Any]) -> None:
		self.collection(document.name).insert_one(data)

	def insert_many(self, document: MongoDocument, data: List[Dict[str, Any]]) -> None:
		self.collection(document.name).insert_many(data)

	def update_by_id(self, document: MongoDocument, data: Dict[str, Any], object_id: Union[ObjectId, str, int]) -> UpdateResult:
		return self.collection(document.name).update_many({'_id': object_id}, {'$set': data})

	def update_many(self, document: MongoDocument, data: Dict[str, Any], criteria: Dict[str, Any]) -> UpdateResult:
		return self.collection(document.name).update_many(
			filter={'$expr': criteria},
			update={'$set': data},
			upsert=False
		)

	def delete_by_id(self, document: MongoDocument, object_id: Union[ObjectId, str, int]) -> DeleteResult:
		return self.collection(document.name).delete_many({'_id': object_id})

	def delete_many(self, document: MongoDocument, criteria: Dict[str, Any]) -> DeleteResult:
		return self.collection(document.name).delete_many({'$expr': criteria})

	def find_by_id(self, document: MongoDocument, object_id: Union[ObjectId, str, int]) -> Dict[str, Any]:
		return self.collection(document.name).find_one({'_id': object_id})

	def find(
			self, document: MongoDocument, criteria: Dict[str, Any], sort: Optional[Dict[str, Any]] = None
	) -> List[
		Dict[str, Any]]:
		if sort is None:
			return list(self.collection(document.name).find(filter={'$expr': criteria}))
		else:
			return list(self.collection(document.name).find(filter={'$expr': criteria}, sort=sort))

	def find_with_project(
			self, document: MongoDocument, project: Dict[str, Any],
			criteria: Dict[str, Any], sort: Optional[Dict[str, Any]] = None):
		if sort is None:
			return list(self.collection(document.name).aggregate(pipeline=[
				{'$match': {'$expr': criteria}},
				{'$project': project}
			]))
		else:
			return list(self.collection(document.name).aggregate(pipeline=[
				{'$match': {'$expr': criteria}},
				{'$project': project},
				{'$sort': sort}
			]))

	def find_all(self, document: MongoDocument) -> List[Dict[str, Any]]:
		return list(self.collection(document.name).find(filter={}))

	def find_distinct(self, document: MongoDocument, column_name: str, criteria: Dict[str, Any]):
		results = list(self.collection(document.name).aggregate(pipeline=[
			{'$match': {'$expr': criteria}},
			{'$group': {'_id': f'${column_name}'}}  # , 'count': { '$sum': 1 } }}
		]))
		for item in results:
			if '_id' in item:
				# noinspection PyProtectedMember
				item[column_name] = item._id
				# noinspection PyProtectedMember
				del item['_id']
		return results

	def exists(self, document: MongoDocument, criteria: Dict[str, any]) -> bool:
		return self.count(document, criteria) != 0

	def count(self, document: MongoDocument, criteria: Dict[str, any]) -> int:
		if criteria:
			results = list(self.collection(document.name).aggregate([
				{'$match': {'$expr': criteria}},
				{'$count': 'count'}
			]))
		else:
			results = list(self.collection(document.name).aggregate([
				{'$count': 'count'}
			]))
		if results:
			return results[0]['count']
		else:
			return 0

	def find_on_group(
			self, document: MongoDocument, project: Dict[str, Any],
			criteria: Dict[str, Any], group: Dict[str, Any],
			sort: Optional[Dict[str, Any]] = None):
		if sort is None:
			return list(self.collection(document.name).aggregate([
				{'$match': {'$expr': criteria}},
				{'$group': group},
				{'$project': project}
			]))
		else:
			return list(self.collection(document.name).aggregate([
				{'$match': {'$expr': criteria}},
				{'$group': group},
				{'$project': project},
				{'$sort': sort}
			]))

	def page(
			self, document: MongoDocument, criteria: Dict[str, Any],
			offset: int, limit: int,
			sort: Optional[Dict[str, Any]] = None):
		pipeline = []
		if criteria:
			pipeline.append({'$match': {'$expr': criteria}})
		if sort:
			pipeline.append({'$sort': sort})
		pipeline.append({'$skip': offset})
		pipeline.append({'$limit': limit})
		return list(self.collection(document.name).aggregate(pipeline))


class MongoEngine:
	def __init__(self, url: str):
		self.url = url

	def connect(self) -> MongoConnection:
		return MongoConnection(self)
