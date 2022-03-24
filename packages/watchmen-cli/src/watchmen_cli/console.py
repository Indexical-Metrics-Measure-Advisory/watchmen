from requests import get

from .auth import login
from .utils import build_headers


def search_template_space(site, space_id):
	headers = build_headers(login(site))
	response = get(f'{site.get("host")}console_space/template/list?space_id={space_id}', headers=headers)
	connect_template_list = response.json()
	template_space_list = []
	for connect_template in connect_template_list:
		connect_id = connect_template["connectId"]
		response = get(f'{site.get("host")}console_space?connect_id={connect_id}', headers=headers)
		template_space_list.append(response.json())
	return template_space_list


# def load


# noinspection PyUnusedLocal
def search_template_chart(site, name):
	pass


# noinspection PyUnusedLocal
def search_template_subject(site, name):
	pass


# noinspection PyUnusedLocal
def load_template_space(site, space_id: str):
	pass


# noinspection PyUnusedLocal
def import_template_space(site, template_space):
	pass


# noinspection PyUnusedLocal
def load_template_subject(site, subject_id):
	pass


# noinspection PyUnusedLocal
def import_template_subject(site, template_subject):
	pass


# noinspection PyUnusedLocal
def load_template_chart(site, chart_id):
	pass


# noinspection PyUnusedLocal
def import_template_chart(site, template_chart):
	pass
