import os
from base64 import b64decode
from json import dumps, loads
from logging import getLogger
from typing import List, Optional, Tuple

from watchmen_cli.common.client import Client
from watchmen_cli.common.constants import connect_id, connected_spaces, import_type, MixedImportType, pipeline_id, \
	pipelines, prefix_encoding, space_id, spaces, topic_id, topics
from watchmen_cli.common.exception import DeployException
from watchmen_utilities import ArrayHelper

logger = getLogger(__name__)


class Deployment:

	def __init__(
			self, host: str, pat: Optional[str],
			username: Optional[str], password: Optional[str],
			path: Optional[str], pattern: Optional[MixedImportType]):
		self.host = host
		self.pat = pat
		self.username = username
		self.password = password
		self.deploy_folder = path
		self.pattern = pattern

	def get_deploy_file(self) -> str:
		for root, ds, fns in os.walk(self.deploy_folder):
			for fn in fns:
				if fn.endswith('.md'):
					fullname = os.path.join(root, fn)
					yield fullname

	def deploy(self):
		for file_name in self.get_deploy_file():
			self.data_parse(file_name)

	@staticmethod
	def read_data_from_markdown(file_content: str) -> Tuple[List, List, List, List]:
		topic_list = []
		pipeline_list = []
		space_list = []
		connect_space_list = []

		json_list = ArrayHelper(file_content.split("\n")) \
			.map(lambda x: x.strip()) \
			.filter(lambda x: x.startswith(prefix_encoding)) \
			.map(lambda x: x.replace(prefix_encoding, '')) \
			.map(lambda x: b64decode(x[0:x.find('"')])) \
			.map(lambda x: loads(x)) \
			.to_list()

		for json_data in json_list:
			if pipeline_id in json_data:
				pipeline_list.append(json_data)
			elif topic_id in json_data:
				topic_list.append(json_data)
			elif space_id in json_data and connect_id not in json_data:
				space_list.append(json_data)
			elif connect_id in json_data:
				connect_space_list.append(json_data)
		return topic_list, pipeline_list, space_list, connect_space_list

	def data_parse(self, fullname: str):
		with open(fullname, encoding='utf-8') as file:
			logger.info(f'Deploy asset fullname: {fullname}')
			data = file.read()
			topic_list, pipeline_list, space_list, connect_space_list = self.read_data_from_markdown(data)
			data_ = {
				topics: topic_list,
				pipelines: pipeline_list,
				spaces: space_list,
				connected_spaces: connect_space_list,
				import_type: self.pattern
			}
			self.import_md_asset(data_)

	def import_md_asset(self, data):
		client = Client(self.host, self.pat, self.username, self.password)
		token = client.login()
		headers = {'Content-Type': 'application/json', 'Authorization': token}
		status, result = client.post('/import', data=dumps(data), headers=headers)
		if status == 200:
			logger.info('Deploy asset successful.')
		else:
			raise DeployException(f"Import md asset failed. Error: {result}")
