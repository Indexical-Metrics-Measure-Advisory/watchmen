import json
import urllib.parse
from typing import Optional, Dict, Any
import urllib.parse
import requests
from datetime import timedelta

from watchmen_auth import AuthFailOn401
from watchmen_model.admin import UserRole, User
from watchmen_model.system import Token
from watchmen_rest_doll.settings import DollSettings
from watchmen_meta.auth import build_find_user_by_name
from watchmen_rest import create_jwt_token
from watchmen_rest_doll.doll import ask_access_token_expires_in, ask_jwt_params


class OIDCAuth:
	
	def __init__(self, settings: DollSettings):
		self.settings = settings
	
	def get_code_key(self) -> str:
		return self.settings.OIDC_CODE_KEY
	
	def get_sso_login_url(self) -> str:
		base_url = self.settings.OIDC_LOGIN_URL
		params_string = self.settings.OIDC_LOGIN_PARAMS
		encoded_params = urllib.parse.quote(params_string)
		return f"{base_url}?{encoded_params}"
	
	def get_access_token(self, code: str) -> str:
		token_url = self.settings.OIDC_TOKEN_ENDPOINT
		code_key = self.settings.OIDC_CODE_KEY
		headers = {
			"Accept": "application/json"
		}
		params = {
			code_key: code
		}
		response = requests.post(token_url, headers=headers, params=params)
		if response.status_code == 200:
			payload = response.json()
			token_key = self.settings.OIDC_TOKEN_KEY
			token = find_value_by_key(payload, token_key)
			return token
		else:
			raise AuthFailOn401('Unauthorized visit.')
	
	def validate_access_token(self, token: str) -> Dict:
		import requests
		headers = {
			"Authorization": f"Bearer {token}",
			"Accept": "application/json"
		}
		response = requests.get(self.settings.OIDC_USER_INFO_ENDPOINT, headers=headers)
		if response.status_code == 200:
			payload = response.json()
			return payload
		else:
			raise AuthFailOn401('Unauthorized visit.')
		
	# noinspection PyMethodMayBeStatic
	def find_user(self, user_name: str) -> Optional[User]:
		return build_find_user_by_name(True)(user_name)
	
	# noinspection PyMethodMayBeStatic
	def build_token(self, access_token: str, user: User) -> Token:
		if self.settings.OIDC_USE_ACCESS_TOKEN:
			return Token(
				accessToken=access_token,
				tokenType='bearer',
				role=user.role,
				tenantId=user.tenantId
			)
		else:
			jwt_secret_key, jwt_algorithm = ask_jwt_params()
			access_token_expires = timedelta(minutes=ask_access_token_expires_in())
			return Token(
				accessToken=create_jwt_token(
					subject=user.name, expires_delta=access_token_expires,
					secret_key=jwt_secret_key, algorithm=jwt_algorithm
				),
				tokenType='bearer',
				role=user.role,
				tenantId=user.tenantId
			)


def find_value_by_key(data: Any, key_: str) -> Optional[str]:
	if isinstance(data, dict):
		if key_ in data:
			return data[key_]
		for key, value in data.items():
			return find_value_by_key(value, key_)
	elif isinstance(data, list):
		for item in data:
			return find_value_by_key(item, key_)
	else:
		return None
		
