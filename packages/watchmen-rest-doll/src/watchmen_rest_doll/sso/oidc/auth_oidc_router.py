from typing import Optional
from urllib.parse import parse_qs

from fastapi import APIRouter
from watchmen_model.system import Token
from watchmen_rest.util import raise_401, raise_404
from watchmen_rest_doll.doll import ask_oidc_enabled, ask_oidc_settings
from watchmen_utilities import ExtendedBaseModel
from .oidc_helper import OIDCAuth

router = APIRouter()


class TokenExchange(ExtendedBaseModel):
	code: Optional[str] = None
	params: Optional[str] = None


class OidcToken(Token):
	accountName: Optional[str] = None
	
	
@router.post('/token/exchange-oidc', tags=['authenticate'])
async def token_exchange(token: TokenExchange) -> Token:
	if ask_oidc_enabled():
		settings = ask_oidc_settings()
		oidc_auth_helper = OIDCAuth(settings)
		access_token = ""
		if token.code:
			access_token = oidc_auth_helper.get_access_token(token.code)
		elif token.params:
			parsed_query_params = parse_qs(token.params)
			parsed_params = {k: v[0] for k, v in parsed_query_params.items()}
			access_token = oidc_auth_helper.get_access_token(
				parsed_params.get(oidc_auth_helper.get_code_key(), None)
			)
		else:
			raise_401("Invalid Code")
		
		if access_token:
			payload = oidc_auth_helper.validate_access_token(access_token)
			user_name = payload[settings.OIDC_USER_SUBJECT_KEY]
			user = oidc_auth_helper.find_user(user_name)
			if user:
				return OidcToken(**oidc_auth_helper.build_token(access_token, user).dict(), accountName=user_name)
			else:
				raise_401("Invalid User Name")
		else:
			raise_401("Invalid Access Token")
	else:
		raise_404()
