import json
from logging import getLogger
from typing import Dict, Optional

from boto3 import client, resource
from boto3.exceptions import Boto3Error

from watchmen_utilities import serialize_to_json

logger = getLogger(__name__)


class SimpleStorageService:
	def __init__(self, access_key_id: str, access_key_secret: str, endpoint: str, bucket_name: str):
		self.access_key_id = access_key_id
		self.access_key_secret = access_key_secret
		self.bucket_name = bucket_name
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

	@staticmethod
	def gen_key(directory: str, id_: str) -> str:
		key = f'{directory}/{id_}.json'
		return key

	def put_object(self, key: str, data: Dict) -> None:
		self.client.put_object(Body=serialize_to_json(data), Bucket=self.bucket_name, Key=key)

	def get_object(self, key: str) -> Optional[Dict]:
		try:
			result = self.client.get_object(Bucket=self.bucket_name, Key=key)
			return json.load(result['Body'])
		except Boto3Error as e:
			logger.error(f'Get object failed, detail: {e.__dict__}')
			return None

	def delete_object(self, key: str) -> int:
		try:
			self.client.delete_object(Bucket=self.bucket_name, Key=key)
			return 1
		except Boto3Error as e:
			logger.error(f'Delete object failed, detail: {e.__dict__}')
			return 0

	def delete_multiple_objects(self, prefix: str) -> None:
		bucket = self.resource.Bucket(self.bucket_name)
		bucket.objects.filter(Prefix=prefix).delete()
