from datetime import datetime
import json
from logging import getLogger
from typing import Dict, Optional

from oss2 import Auth, Bucket, ObjectIterator
from oss2.exceptions import NoSuchKey

from watchmen_storage import ask_object_storage_need_date_directory
from watchmen_utilities import serialize_to_json

logger = getLogger(__name__)


class ObjectStorageService:
	def __init__(self, access_key_id: str, access_key_secret: str, endpoint: str, bucket_name: str):
		self.access_key_id = access_key_id
		self.access_key_secret = access_key_secret
		self.auth = Auth(access_key_id, access_key_secret)
		self.bucket = Bucket(self.auth, endpoint, bucket_name)

	@staticmethod
	def gen_key(directory: str, id_: str) -> str:
		if ask_object_storage_need_date_directory():
			now = datetime.now()
			year = now.strftime("%Y")
			month = now.strftime("%m")
			day = now.strftime("%d")
			key = f'{year}/{month}/{day}/{directory}/{id_}.json'
		else:
			key = f"{directory}/{id_}.json"
		return key

	def put_object(self, key: str, data: Dict) -> None:
		return self.bucket.put_object(key, serialize_to_json(data))

	def get_object(self, key: str) -> Optional[Dict]:
		try:
			result = self.bucket.get_object(key)
			return json.load(result)
		except NoSuchKey as e:
			logger.error(f"NoSuchKey, detail: {e.details}")
			return None

	def delete_object(self, key: str) -> int:
		try:
			self.bucket.delete_object(key)
			return 1
		except NoSuchKey as e:
			logger.error(f"NoSuchKey, detail: {e.details}")
			return 0

	def delete_multiple_objects(self, prefix: str) -> None:
		for obj in ObjectIterator(self.bucket, prefix=prefix):
			self.delete_object(obj.key)
