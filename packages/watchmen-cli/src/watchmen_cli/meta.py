from json import dumps

from requests import post

from .auth import login
from .utils import build_headers


def build_pat_headers(site):
	headers = {'Content-Type': 'application/json', 'Authorization': f'pat {site.get("pat")}'}
	return headers


def import_asset(site, import_asset_request):
	# headers =
	response = post(f'{site.get("host")}import', data=dumps(import_asset_request), headers=get_http_headers(site))
	if response.status_code == 200:
		print(response.json())
	else:
		print(response.text)


def get_http_headers(site):
	if 'pat' in site:
		headers = build_pat_headers(site)
	else:
		headers = build_headers(login(site))
	# access_token = login(site)
	return headers


def import_md_asset(host, token, data):
	headers = {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token}
	response = post(f'{host}/import', data=dumps(data), headers=headers)
	if response.status_code == 200:
		print(response.json())
	else:
		print(response.text)
