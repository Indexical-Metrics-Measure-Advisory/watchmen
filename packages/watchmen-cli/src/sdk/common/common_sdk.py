import json

import requests

from sdk.auth.auth_sdk import login
from sdk.utils.header_utils import build_headers


def import_instances(instances):
	headers = build_headers(login())
	for instance in instances:
		response = requests.post(
			"http://localhost:8000/topic/data", data=json.dumps(instance), headers=headers)
		print(response.status_code)


def remove_topic_collection(collections):
	headers = build_headers(login())
	response = requests.post(
		"http://localhost:8000/topic/data/remove", data=json.dumps(collections), headers=headers)
	print(response.status_code)


def test_url(url):
	response = requests.get(url)
	return response
