from logging import getLogger
from typing import Any, Dict, Optional, Tuple, Union

from requests import get, post, RequestException

from watchmen_cli.common.constants import access_token, login_url
from watchmen_cli.common.exception import AuthenticationException

logger = getLogger(__name__)


class Client:

	def __init__(self, host: str, pat: Optional[str], username: Optional[str], password: Optional[str]):
		self.host = host
		self.pat = pat
		self.username = username
		self.password = password

	def login(self) -> str:
		token = None
		if self.pat:
			token = f"pat {self.pat}"
			return token
		else:
			if self.username and self.password:
				login_data = {'username': self.username, 'password': self.password}
				headers = {'Content-Type': 'application/x-www-form-urlencoded'}
				status, result = self.post(login_url, login_data, headers)
				token = result.get(access_token, None)
		if token:
			return f"Bearer {token}"
		else:
			raise AuthenticationException("Need Pat or UserName/Password")

	def post(
			self, url: str, data: Optional[Union[Dict, str]], headers: Optional[Dict],
			params: Optional[Dict] = None) -> Tuple[int, Any]:
		try:
			response = post(self.host_url(url), data=data, params=params, headers=headers)
			return response.status_code, response.json()
		except RequestException as e:
			logger.error(e, exc_info=True)
			return 0, None

	def get(
			self, url: str,
			params: Optional[Dict],
			headers: Optional[Dict]) -> Tuple[int, Any]:
		try:
			response = get(self.host_url(url), params=params, headers=headers)
			if response.status_code == 200:
				return response.status_code, response.json()
			else:
				return response.status_code, response.text
		except RequestException as e:
			logger.error(e, exc_info=True)
			return 0, None

	def host_url(self, url) -> str:
		return f"{self.host}{url}"
