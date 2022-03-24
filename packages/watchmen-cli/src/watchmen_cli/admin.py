from json import dumps

from requests import get, post

from .auth import login
from .utils import build_headers


def as_url(site, url: str) -> str:
	return f'{site.get("host")}{url}'


def search_topics(site, name):
	headers = build_headers(login(site))
	response = get(as_url(site, f'topic/name?query_name={name}'), headers=headers)
	return response.json()


def import_topics(site, topics):
	headers = build_headers(login(site))
	for topic in topics:
		response = post(as_url(site, 'topic/import'), data=dumps(topic), headers=headers)
		if response.status_code == 200:
			print("import successfully")
		else:
			print(response.text)


def load_topic_list(site, names):
	headers = build_headers(login(site))
	response = post(as_url(site, 'topic/list/name'), data=dumps(names), headers=headers)
	return response.json()


# noinspection PyUnusedLocal
def load_user_list(site, username_list):
	headers = build_headers(login(site))


def search_spaces(site, name):
	headers = build_headers(login(site))
	response = get(as_url(site, f'space/name?query_name={name}'), headers=headers)
	return response.json()


def load_space_list(site, names):
	headers = build_headers(login(site))
	response = post(as_url(site, 'space/list/name'), data=dumps(names), headers=headers)

	return response.json()


def load_user_groups(site, names):
	headers = build_headers(login(site))
	response = post(as_url(site, 'user_group/list/name'), data=dumps(names), headers=headers)

	data = response.json()
	# print(data)
	return data


def import_spaces(site, spaces):
	headers = build_headers(login(site))
	for space in spaces:
		response = post(as_url(site, 'space/import'), data=dumps(space), headers=headers)
		if response.status_code == 200:
			print("import successfully")


def list_all_pipeline(site):
	headers = build_headers(login(site))
	response = get(as_url(site, 'pipeline/all'), headers=headers)
	return response.json()


def load_pipeline_by_id(site, pipeline_id):
	headers = build_headers(login(site))
	response = get(as_url(site, f'pipeline?pipeline_id={pipeline_id}'), headers=headers)
	return response.json()


def import_pipelines(site, pipelines):
	headers = build_headers(login(site))
	for pipeline in pipelines:
		response = post(as_url(site, 'pipeline/import'), data=dumps(pipeline), headers=headers)
		if response.status_code == 200:
			print("import successfully")
		else:
			print(response.text)


def search_user_groups(site, name):
	headers = build_headers(login(site))
	response = get(as_url(site, f'user_group/name?query_name={name}'), headers=headers)
	return response.json()


def import_user_groups(site, groups):
	headers = build_headers(login(site))
	for group in groups:
		response = post(as_url(site, 'user_group/import'), data=dumps(group), headers=headers)
		if response.status_code == 200:
			print("import successfully")


def search_users(site, name):
	headers = build_headers(login(site))
	response = get(as_url(site, f'user/name?query_name={name}'), headers=headers)
	# print(response.status_code)
	return response.json()


def import_users(site, users):
	headers = build_headers(login(site))
	for user in users:
		response = post(as_url(site, 'user/import'), data=dumps(user), headers=headers)
		if response.status_code == 200:
			print("import successfully")


def load_users(site, names):
	print(dumps(names))
	headers = build_headers(login(site))
	response = post(as_url(site, 'user/list/name'), data=dumps(names), headers=headers)
	data = response.json()
	# print(response.json())
	# print(data)
	return data
