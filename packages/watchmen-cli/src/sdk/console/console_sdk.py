from sdk.auth.auth_sdk import login
from sdk.utils.header_utils import build_headers
import requests


def search_template_space(site, space_id):
    headers = build_headers(login(site))
    response = requests.get(site["host"] + "console_space/template/list?space_id=" + space_id, headers=headers)
    connect_template_list =  response.json()
    template_space_list= []
    for connect_template in connect_template_list:
        connect_id = connect_template["connectId"]
        response = requests.get(site["host"] + "console_space?connect_id=" + connect_id, headers=headers)
        template_space_list.append(response.json())
    return template_space_list


# def load


def search_template_chart(site,name):

    pass


def search_template_subject(site,name):
    pass


def load_template_space(site,id:str):
    pass


def import_template_space(site,template_space):
    pass


def load_template_subject(site,subject_id):
    pass


def import_template_subject(site,template_subject):
    pass


def load_template_chart(site,chart_id):
    pass


def import_template_chart(site,template_chart):
    pass
