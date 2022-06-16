import json
import os
from logging import getLogger
from typing import Optional

from watchmen_cli.common.client import Client
from watchmen_cli.common.exception import RerunException

logger = getLogger(__name__)


class Rerun:

	def __init__(
			self, host: str, pat: Optional[str],
			username: Optional[str], password: Optional[str],
			path: Optional[str]):
		self.host = host
		self.pat = pat
		self.username = username
		self.password = password
		self.rerun_folder = path

	def get_rerun_file(self) -> str:
		for root, ds, fns in os.walk(self.rerun_folder):
			for fn in fns:
				if fn.endswith('.json'):
					fullname = os.path.join(root, fn)
					yield fullname

	def rerun(self):
		for file_name in self.get_rerun_file():
			self.data_parse(file_name)

	def data_parse(self, fullname: str):
		with open(fullname, encoding='utf-8') as file:
			logger.info(f'Rerun file fullname: {fullname}')
			content = json.load(file)
			if "data" in content:
				for item in content["data"]:
					if Rerun.check_data(item):
						try:
							self.do_run(item.get("dataId", None),
							            item.get("topicId", None),
							            item.get("pipelineId", None))
						except RerunException as err:
							logger.error(f"rerun failed: {item}")
					else:
						logger.error(f"rerun failed: {item}")
			else:
				logger.error(f"rerun failed. the file is error: {fullname}")

	def do_run(self, data_id: str, topic_id: str, pipeline_id: str):
		if data_id is None or topic_id is None or pipeline_id is None:
			raise RerunException(
				f"rerun topic {topic_id} data {data_id} pipeline {pipeline_id} failed.")
		client = Client(self.host, self.pat, self.username, self.password)
		token = client.login()
		headers = {'Content-Type': 'application/json', 'Authorization': token}
		params = Rerun.build_params(data_id, topic_id, pipeline_id)
		status, result = client.get('/topic/data/rerun', params=params, headers=headers)
		if status == 200:
			logger.info(f"rerun topic {topic_id} data {data_id} pipeline {pipeline_id} successful.")
		else:
			raise RerunException(
				f"rerun topic {topic_id} data {data_id} pipeline {pipeline_id} failed. Error: {result}")

	@staticmethod
	def build_params(data_id: str, topic_id: str, pipeline_id: str):
		return {"topic_id": topic_id,
		        "data_id": data_id,
		        "pipeline_id": pipeline_id}

	@staticmethod
	def check_data(data: dict):
		if "topicId" in data and "dataId" in data and "pipelineId" in data:
			return True
		else:
			return False
