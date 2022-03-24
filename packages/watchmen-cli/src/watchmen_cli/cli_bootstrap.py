from enum import Enum
from json import dump, dumps, load
from os import path
from typing import Any, Dict, List

from requests import post

from .common import test_url
from .constants import FILE
from .service import import_markdowns, import_markdowns_v2, list_pipeline, search_space, search_topic, search_user, \
	search_user_group, sync_pipeline, sync_space, sync_topic, sync_user, sync_user_group
from .utils import create_file, create_folder, load_file_to_json, load_folder

IMPORT = 'import'
GENERATE = 'generate'
COMBINE = 'combine'


class ModelType(str, Enum):
	TOPIC = 'topic'
	PIPELINE = 'pipeline'
	USER = 'user'
	USER_GROUP = 'user_group'
	SPACE = 'space'
	CONNECT_SPACE = 'connect_space'
	SUBJECT = 'subject'
	REPORT = 'report'
	DASHBOARD = 'dashboard'


def get_access_token(host: str, username: str, password: str) -> str:
	login_data = {'username': username, 'password': password, 'grant_type': 'password'}
	headers = {'Content-Type': 'application/x-www-form-urlencoded'}
	response = post(f'{host}/login/access-token', data=login_data, headers=headers)
	token = response.json().get('access_token')
	return token


# noinspection DuplicatedCode
def import_topics_to_env(token: str, host: str, topics: List[Dict[str, Any]]) -> None:
	headers = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token}
	for topic in topics:
		response = post(
			f'{host}/topic/import', data=dumps(topic), headers=headers)
		if response.status_code == 200:
			print(f'Import topic[{topic.get("name")}] successfully')
		else:
			print(f'Import topic[{topic.get("name")}] failed.')


# noinspection DuplicatedCode
def import_pipelines_to_env(token: str, host: str, pipelines: List[Dict[str, Any]]) -> None:
	headers = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token}
	for pipeline in pipelines:
		response = post(
			f'{host}/pipeline/import', data=dumps(pipeline), headers=headers)
		if response.status_code == 200:
			print(f'Import pipeline[{pipeline.get("name")}] successfully.')
		else:
			print(f'Import pipeline[{pipeline.get("name")}] failed.')


class CliBootstrap:
	# noinspection PyMethodMayBeStatic
	def __load_site_json(self):
		data = {}
		if path.exists('site/site.json'):
			with open('site/site.json', 'r') as outfile:
				data = load(outfile)
				return data
		else:
			return data

	# noinspection PyMethodMayBeStatic
	def __test_url(self, url: str) -> None:
		response = test_url(url)
		print(response.status_code)
		print(response.text)

	# noinspection PyMethodMayBeStatic
	def __save_to_json(self, data: Dict[str, Any]) -> None:
		with open('temp/site.json', 'w') as outfile:
			dump(data, outfile)

	def add_site(self, name: str, host: str, username: str = None, password: str = None) -> None:
		sites = self.__load_site_json()
		sites[name] = {'host': host, 'username': username, 'password': password}
		self.__save_to_json(sites)

	def search(self, model_type: str, site: str, name: str) -> None:
		model_type = ModelType(model_type)

		switcher_search = {
			ModelType.TOPIC.value: search_topic,
			ModelType.SPACE.value: search_space,
			ModelType.USER.value: search_user,
			ModelType.USER_GROUP.value: search_user_group
		}

		sites = self.__load_site_json()
		switcher_search.get(model_type.value)(sites[site], name)

	def asset(self, folder, site=None, import_type=None, markdown_file=None):
		sites = self.__load_site_json()
		import_markdowns(folder, sites[site], import_type, markdown_file)

	def test(self, url):
		self.__test_url(url)

	def hosts(self):
		print(self.__load_site_json())

	def list(self, model_type, site):
		model_type = ModelType(model_type)
		sites = self.__load_site_json()

		switcher_list = {
			ModelType.PIPELINE.value: list_pipeline
		}

		switcher_list.get(model_type)(sites[site])

	# noinspection PyDefaultArgument
	def sync(self, model_type: str, source: str, target: str, keys: List[str] = []) -> None:
		model_type = ModelType(model_type)
		sites = self.__load_site_json()
		switcher_sync = {
			ModelType.TOPIC.value: sync_topic,
			ModelType.SPACE.value: sync_space,
			ModelType.USER_GROUP.value: sync_user_group,
			ModelType.PIPELINE.value: sync_pipeline,
			ModelType.USER.value: sync_user

		}

		if target == FILE:
			target_site = FILE
		else:
			target_site = sites[target]

		if source == FILE:
			source_site = FILE
		else:
			source_site = sites[source]

		switcher_sync.get(model_type.value)(source_site, target_site, keys)

	# noinspection PyMethodMayBeStatic
	def raw(self, op_type, a_path: str):
		if op_type == COMBINE:
			root_folder = load_folder(a_path)
			for folder in root_folder.iterdir():
				if folder.is_dir():
					instance_path = str(folder.resolve()) + '_instance'
					instance_list = []
					create_folder(instance_path)
					for p in folder.iterdir():
						if p.is_file():
							instance_list.append(load_file_to_json(p))
					create_file(instance_path, f'{folder.name}-instance.json', instance_list)
			print('All instances are created')
		else:
			raise KeyError(f'Type[{op_type}] is not supported.')

	def verify_topic(self):
		pass

	def deploy(self, host: str, username: str, password: str):
		self.deploy_topics(host, username, password)
		self.deploy_pipelines(host, username, password)

	# noinspection PyMethodMayBeStatic
	def deploy_topics(self, host: str, username: str, password: str):
		try:
			token = get_access_token(host, username, password)
			print('import topics first')
			with open('/app/config/topic/topic.json', 'r') as src:
				topics = load(src)
				import_topics_to_env(token, host, topics)
		except Exception as err:
			raise err

	# noinspection PyMethodMayBeStatic
	def deploy_pipelines(self, host: str, username: str, password: str):
		try:
			token = get_access_token(host, username, password)
			print('import pipelines')
			with open('/app/config/pipeline/pipeline.json', 'r') as src:
				pipelines = load(src)
				import_pipelines_to_env(token, host, pipelines)
		except Exception as err:
			raise err

	def deploy_template(self, host: str, username: str, password: str):
		pass

	# noinspection PyMethodMayBeStatic
	def deploy_asset(self, host: str, username: str, password: str):
		try:
			token = get_access_token(host, username, password)
			print('Import markdown asset')
			print(token)
			import_markdowns_v2(host, token, 'replace')
		except Exception as err:
			raise err
