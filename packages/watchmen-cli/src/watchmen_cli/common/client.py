from typing import Optional, Tuple, Any, Dict, Union
from logging import getLogger
from requests import post, RequestException

from watchmen_cli.common.constants import login_url, access_token
from watchmen_cli.common.exception import AuthenticationException
from watchmen_cli.settings import settings

logger = getLogger(__name__)


class Client:

    def __init__(self):
        pass

    def login(self):
        token = None
        if settings.META_CLI_PAT:
            token = f"pat {settings.META_CLI_PAT}"
        else:
            if settings.META_CLI_USERNAME and settings.META_CLI_PASSWORD:
                login_data = {'username': settings.META_CLI_USERNAME, 'password': settings.META_CLI_PASSWORD}
                headers = {'Content-Type': 'application/x-www-form-urlencoded'}
                status, result = self.post(login_url, login_data, headers)
                token = result.get(access_token, None)
        if token:
            return f"Bearer {token}"
        else:
            raise AuthenticationException("Need Pat or UserName/Password")

    def post(self, url: str, data: Optional[Union[Dict, str]], headers: Optional[Dict],
             params: Optional[Dict] = None) -> Tuple[int, Any]:
        try:
            response = post(self.host(url), data=data, params=params, headers=headers)
            return response.status_code, response.json()
        except RequestException as e:
            logger.error(e, exc_info=True)
            return 0, None

    @staticmethod
    def host(url) -> str:
        return f"{settings.META_CLI_HOST}{url}"
