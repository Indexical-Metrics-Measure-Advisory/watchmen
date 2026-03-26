from __future__ import annotations

from typing import Any, Dict, Optional

import requests

from agent_cli.exceptions import ApiException, AuthenticationException

LOGIN_URL = "/login"


class RestClient:
    def __init__(
        self,
        host: str,
        pat: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        timeout_seconds: int = 30,
    ) -> None:
        self.host = host.rstrip("/")
        self.pat = pat
        self.username = username
        self.password = password
        self.timeout_seconds = timeout_seconds
        self._token: Optional[str] = None

    def auth_header(self) -> Dict[str, str]:
        token = self._login()
        return {"Authorization": token}

    def get_json(self, path: str, params: Optional[Dict[str, Any]] = None) -> Any:
        url = self._url(path)
        headers = self.auth_header()
        try:
            response = requests.get(url, params=params, headers=headers, timeout=self.timeout_seconds)
        except requests.RequestException as e:
            raise ApiException(f"GET {path} failed: {e}") from e
        if response.status_code >= 400:
            raise ApiException(f"GET {path} failed with {response.status_code}: {response.text}")
        return response.json()

    def post_json(self, path: str, payload: Any) -> Any:
        url = self._url(path)
        headers = self.auth_header()
        headers["Content-Type"] = "application/json"
        try:
            response = requests.post(url, json=payload, headers=headers, timeout=self.timeout_seconds)
        except requests.RequestException as e:
            raise ApiException(f"POST {path} failed: {e}") from e
        if response.status_code >= 400:
            raise ApiException(f"POST {path} failed with {response.status_code}: {response.text}")
        if not response.text:
            return None
        return response.json()

    def get_text(self, path: str, params: Optional[Dict[str, Any]] = None) -> str:
        url = self._url(path)
        headers = self.auth_header()
        try:
            response = requests.get(url, params=params, headers=headers, timeout=self.timeout_seconds)
        except requests.RequestException as e:
            raise ApiException(f"GET {path} failed: {e}") from e
        if response.status_code >= 400:
            raise ApiException(f"GET {path} failed with {response.status_code}: {response.text}")
        return response.text

    def post_text(self, path: str, payload: str, content_type: str = "application/x-yaml") -> str:
        url = self._url(path)
        headers = self.auth_header()
        headers["Content-Type"] = content_type
        try:
            response = requests.post(url, data=payload.encode('utf-8'), headers=headers, timeout=self.timeout_seconds)
        except requests.RequestException as e:
            raise ApiException(f"POST {path} failed: {e}") from e
        if response.status_code >= 400:
            raise ApiException(f"POST {path} failed with {response.status_code}: {response.text}")
        return response.text

    def _login(self) -> str:
        if self._token:
            return self._token
        if self.pat:
            self._token = f"pat {self.pat}"
            return self._token
        if not self.username or not self.password:
            raise AuthenticationException("Need PAT or username/password")
        try:
            response = requests.post(
                self._url(LOGIN_URL),
                data={"username": self.username, "password": self.password},
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=self.timeout_seconds,
            )
        except requests.RequestException as e:
            raise AuthenticationException(f"Login failed: {e}") from e
        if response.status_code >= 400:
            raise AuthenticationException(f"Login failed with {response.status_code}: {response.text}")
        payload = response.json()
        token = payload.get("accessToken")
        if not token:
            raise AuthenticationException("Login response does not contain accessToken")
        self._token = f"Bearer {token}"
        return self._token

    def _url(self, path: str) -> str:
        if path.startswith("http://") or path.startswith("https://"):
            return path
        if not path.startswith("/"):
            path = f"/{path}"
        return f"{self.host}{path}"
