import json

import requests

from sdk.auth.auth_sdk import login
from sdk.utils.header_utils import build_headers


def search_topics(site, name):
    headers = build_headers(login(site))
    response = requests.get(site["host"] + "topic/query?query_name=" + name, headers=headers)
    return response.json()


def import_topics(site,topics):
    headers = build_headers(login(site))
    for topic in topics:
        response = requests.post(site["host"] + "import/admin/topic", data=json.dumps(topic),
                                 headers=headers)
        if response.status_code==200:
            print("import successfully")
        else:
            print(response.text)


def load_topic_list(site,names):
    headers = build_headers(login(site))
    response = requests.post(site["host"] + "topic/list/name", data=json.dumps(names),
                             headers=headers)

    return response.json()


def load_user_list(site,username_list):
    headers = build_headers(login(site))


def search_spaces(site,name):
    headers = build_headers(login(site))
    response = requests.get(site["host"] + "query/space/group?query_name=" + name, headers=headers)
    # print(response.status_code)
    return response.json()


def load_space_list(site,names):
    headers = build_headers(login(site))
    response = requests.post(site["host"] + "space/list/name", data=json.dumps(names),
                             headers=headers)

    return response.json()


def load_user_groups(site,names):
    headers = build_headers(login(site))
    response = requests.post(site["host"] + "user_group/list/name", data=json.dumps(names),
                             headers=headers)

    data = response.json()
    # print(data)
    return data


def import_spaces(site,spaces):
    headers = build_headers(login(site))
    for space in spaces:
        response = requests.post(site["host"] + "import/admin/space", data=json.dumps(space),
                                 headers=headers)
        if response.status_code==200:
            print("import successfully")


def list_all_pipeline(site):
    headers = build_headers(login(site))
    response = requests.get(site["host"] + "pipeline/all",headers=headers)
    return response.json()


def load_pipeline_by_id(site,id):
    headers = build_headers(login(site))
    response = requests.get(site["host"] + "pipeline/id?pipeline_id="+str(id), headers=headers)
    return response.json()


def import_pipelines(site,pipelines):
    headers = build_headers(login(site))
    for pipeline in pipelines:
        response = requests.post(site["host"] + "import/admin/pipeline", data=json.dumps(pipeline),
                                 headers=headers)
        if response.status_code == 200:
            print("import successfully")
        else:
            print(response.text)


def search_users(site,name):
    headers = build_headers(login(site))
    response = requests.get(site["host"] + "query/user/group?query_name=" + name, headers=headers)
    # print(response.status_code)
    return response.json()


def search_user_groups(site,name):
    headers = build_headers(login(site))
    response = requests.get(site["host"] + "query/user_group/space?query_name=" + name, headers=headers)
    # print(response.status_code)
    return response.json()


def import_user_groups(site,groups):
    headers = build_headers(login(site))
    for group in groups:
        # print(json.dumps(group))
        response = requests.post(site["host"] + "import/admin/user/group", data=json.dumps(group),
                                 headers=headers)
        if response.status_code == 200:
            print("import successfully")


def import_users(site,users):
    headers = build_headers(login(site))
    for user in users:
        response = requests.post(site["host"] + "import/admin/user", data=json.dumps(user),
                                 headers=headers)
        if response.status_code == 200:
            print("import successfully")


def load_users(site,names):
    print(json.dumps(names))
    headers = build_headers(login(site))
    response = requests.post(site["host"] + "user/list/name", data=json.dumps(names),
                             headers=headers)
    data = response.json()
    # print(response.json())
    # print(data)
    return data
