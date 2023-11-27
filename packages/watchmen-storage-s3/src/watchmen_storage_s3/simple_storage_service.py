import json
from logging import getLogger
from typing import Dict, Optional, List, Union

from boto3 import client, resource
from boto3.exceptions import Boto3Error
from datetime import datetime

from watchmen_model.common import DataModel
from watchmen_model.system import DataSourceParam
from watchmen_storage import ask_object_storage_need_date_directory, EntityCriteria
from watchmen_utilities import serialize_to_json, ArrayHelper
from .object_defs_s3 import as_file_name
from .where_build import build_criteria

logger = getLogger(__name__)


class ObjectContent(DataModel):
	key: str
	lastModified: datetime
	eTag: str
	size: int
	storageClass: str


class SimpleStorageService:
	def __init__(self, access_key_id: str, access_key_secret: str, endpoint: str, bucket_name: str,
	             params: Optional[List[DataSourceParam]]):
		self.access_key_id = access_key_id
		self.access_key_secret = access_key_secret
		self.bucket_name = bucket_name
		self.params = params
		self.client = client(
			service_name='s3',
			region_name=endpoint,
			aws_access_key_id=access_key_id,
			aws_secret_access_key=access_key_secret
		)
		self.resource = resource(
			service_name='s3',
			region_name=endpoint,
			aws_access_key_id=access_key_id,
			aws_secret_access_key=access_key_secret)

	def gen_key(self, directory: str, id_: str) -> str:
		if ask_object_storage_need_date_directory():
			literal = self.get_param("filename")
			key = as_file_name(literal, directory, id_)
		else:
			prefix = self.get_param("s3_prefix")
			key = f'{prefix}/{directory}/{id_}'
		return key

	def get_param(self, param_key: str) -> Union[None, str, int]:
		for param in self.params:
			if param.name == param_key:
				return param.value

	def put_object(self, key: str, data: Dict) -> None:
		self.client.put_object(Body=serialize_to_json(data), Bucket=self.bucket_name, Key=key)

	def get_object(self, key: str) -> Optional[Dict]:
		try:
			result = self.client.get_object(Bucket=self.bucket_name, Key=key)
			return json.load(result['Body'])
		except Boto3Error as e:
			logger.error(f'Get object failed, detail: {e.__dict__}', stack_info=True, exc_info=True)
			return None

	def delete_object(self, key: str) -> int:
		try:
			self.client.delete_object(Bucket=self.bucket_name, Key=key)
			return 1
		except Boto3Error as e:
			logger.error(f'Delete object failed, detail: {e.__dict__}', stack_info=True, exc_info=True)
			return 0

	def delete_objects_by_prefix(self, directory: str) -> None:
		s3_prefix = self.get_param("s3_prefix")
		prefix = f'{s3_prefix}/{directory}/'
		bucket = self.resource.Bucket(self.bucket_name)
		bucket.objects.filter(Prefix=prefix).delete()

	def list_objects(self, max_keys: int = 10, prefix: Optional[str] = None) -> List[ObjectContent]:
		bucket = self.resource.Bucket(self.bucket_name)
		try:
			if prefix:
				response = self.client.list_objects_v2(Bucket=self.bucket_name, MaxKeys=max_keys, Prefix=prefix)
			else:
				response = self.client.list_objects_v2(Bucket=self.bucket_name, MaxKeys=max_keys)

			if response.get('Contents', None):
				objects = ArrayHelper(response['Contents']).map(lambda x: ObjectContent(key=x.get('Key'),
				                                                                        lastModified=x.get(
					                                                                        'LastModified'),
				                                                                        eTag=x.get('ETag'),
				                                                                        size=x.get('Size'),
				                                                                        storageClass=x.get(
					                                                                        'StorageClass'))).to_list()
			else:
				objects = []
		except Boto3Error:
			logger.error("Couldn't get objects for bucket '%s'.", bucket.name, stack_info=True, exc_info=True)
			raise
		else:
			return objects

	def get_objects_by_criteria(self, directory: Optional[str], criteria: EntityCriteria) -> Optional[List[ObjectContent]]:
		paginator = self.client.get_paginator('list_objects_v2')
		page_iterator = paginator.paginate(Bucket=self.bucket_name,
		                                   Prefix=self.ask_table_path(directory))
		result = []
		for page in page_iterator:
			if page.get('KeyCount', 0) > 0:
				for obj in page['Contents']:
					if obj.get('Key') != self.ask_table_path(directory) and build_criteria(obj, criteria):
						result.append(ObjectContent(key=obj.get('Key'),
						                            lastModified=obj.get('LastModified'),
						                            eTag=obj.get('ETag'),
						                            size=obj.get('Size'),
						                            storageClass=obj.get('StorageClass')
						                            )
						              )
		return result

	def ask_table_path(self, table_name: str) -> str:
		prefix = self.get_param("s3_prefix")
		return f"{prefix}/{table_name}/"
