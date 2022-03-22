import json

import requests

from sdk.auth.auth_sdk import login
from sdk.utils.header_utils import build_headers


def build_pat_headers(site):
    headers = {"Content-Type": "application/json", "Authorization": "pat " + site["pat"]}
    return headers


def import_asset(site, import_asset_request):
    # headers =
    response = requests.post(site["host"] + "import", data=json.dumps(import_asset_request),
                             headers=get_http_headers(site))
    if response.status_code == 200:
        print(response.json())
    else:
        print(response.text)


def get_http_headers(site):
    if "pat" in site:
        headers = build_pat_headers(site)
    else:
        headers = build_headers(login(site))
        # access_token = login(site)
    return headers


def import_md_asset(host, token, data):
    headers = {"Content-Type": "application/json", "Authorization": "Bearer " + token}
    url = host + "/import"
    response = requests.post(url, data=json.dumps(data), headers=headers)
    if response.status_code == 200:
        print(response.json())
    else:
        print(response.text)
