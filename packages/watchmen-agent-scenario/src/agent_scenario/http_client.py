from typing import Any, Dict, Optional

import requests


class HttpError(Exception):
	"""Raised when a Watchmen REST call returns a non-2xx status."""


class ApiClient:
	"""Minimal HTTP client speaking the Watchmen auth dialect.

	Same rules as the agent CLIs: prefer `Authorization: pat <PAT>`, otherwise log
	in once with username/password and reuse the returned access token.
	"""

	def __init__(
			self, host: str, pat: str = '', username: str = '', password: str = '',
			timeout: int = 60) -> None:
		self.host = host.rstrip('/')
		self.pat = pat
		self.username = username
		self.password = password
		self.timeout = timeout
		self.__token: Optional[str] = None

	def _auth_header(self) -> Dict[str, str]:
		if self.__token:
			return {'Authorization': self.__token}
		if self.pat:
			self.__token = f'pat {self.pat}'
			return {'Authorization': self.__token}
		if not self.username or not self.password:
			raise HttpError('PAT or username/password is required')
		response = requests.post(
			f'{self.host}/login',
			data={'username': self.username, 'password': self.password},
			headers={'Content-Type': 'application/x-www-form-urlencoded'},
			timeout=self.timeout)
		if response.status_code >= 400:
			raise HttpError(f'Login failed with {response.status_code}: {response.text}')
		token = (response.json() or {}).get('accessToken')
		if not token:
			raise HttpError('Login response does not contain accessToken')
		self.__token = f'Bearer {token}'
		return {'Authorization': self.__token}

	def _request(self, method: str, path: str, params=None, json_body=None, data=None, headers=None) -> requests.Response:
		url = f'{self.host}/{path.lstrip("/")}'
		all_headers = self._auth_header()
		if headers:
			all_headers.update(headers)
		try:
			response = requests.request(
				method, url, params=params, json=json_body, data=data,
				headers=all_headers, timeout=self.timeout)
		except requests.RequestException as e:
			raise HttpError(f'{method} {path} failed: {e}') from e
		if response.status_code >= 400:
			raise HttpError(f'{method} {path} failed with {response.status_code}: {response.text[:500]}')
		return response

	def get(self, path: str, params=None) -> Any:
		return self._request('GET', path, params=params).json()

	def post(self, path: str, json_body: Any = None) -> Any:
		response = self._request('POST', path, json_body=json_body)
		if not response.content:
			return {}
		return response.json()

	def post_text(self, path: str, payload: str, content_type: str = 'application/x-yaml') -> Any:
		response = self._request(
			'POST', path, data=payload.encode('utf-8'),
			headers={'Content-Type': content_type})
		if not response.content:
			return {}
		return response.json()

	def delete(self, path: str, params=None) -> Any:
		response = self._request('DELETE', path, params=params)
		if not response.content:
			return {}
		return response.json()
