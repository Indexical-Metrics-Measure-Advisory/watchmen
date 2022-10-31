from abc import ABC, abstractmethod
from enum import Enum
from typing import Dict
import boto3
import json
import logging


logger = logging.getLogger(__name__)


class SecretType(str, Enum):
	AWS = 'aws',
	ALIYUN = 'aliyun',
	AZURE = 'azure'


class SecretsManger(ABC):
	
	@abstractmethod
	def ask_secrets(self, secret_id) -> Dict:
		pass


class AmazonSecretsManger(SecretsManger):
	
	def __init__(self, region_name: str, access_key_id: str = None, access_secret_id: str = None):
		self.client = boto3.client(
			service_name='secretsmanager',
			region_name=region_name,
			aws_access_key_id=access_key_id,
			aws_secret_access_key=access_secret_id
		)
	
	def ask_secrets(self, secret_id) -> Dict:
		try:
			response = self.client.get_secret_value(
				SecretId=secret_id
			)
			return json.loads(response['SecretString'])
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			raise RuntimeError(e)
