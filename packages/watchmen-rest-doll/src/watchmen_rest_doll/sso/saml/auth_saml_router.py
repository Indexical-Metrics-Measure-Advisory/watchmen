from fastapi import APIRouter, Request
from onelogin.saml2.auth import OneLogin_Saml2_Auth
from pydantic import BaseModel

from watchmen_model.system import Token
from watchmen_rest.util import raise_401
from watchmen_rest_doll.doll import ask_saml_settings
from watchmen_rest_doll.settings import DollSettings
from watchmen_rest_doll.sso.saml.saml_helper import build_token, find_user, get_user_name_in_saml_body, \
	prepare_from_fastapi_request, verify_signature
from ..sso_types import SSOTypes

router = APIRouter()

settings = DollSettings()


class LoginConfiguration(BaseModel):
	loginMethod: str = 'doll',
	loginUrl: str = None


class TokenExchange(BaseModel):
	data: str = None
	algorithm: str = None
	signature: str = None
	relayState: str = None



@router.post('/token/exchange-saml', tags=['authenticate'])
async def token_exchange(token: TokenExchange) -> Token:
	if settings.SSO_ON and settings.SSO_PROVIDER == "saml2":
		if verify_signature(
				token.data, token.algorithm, token.signature, token.relayState,
				ask_saml_settings()):
			user_name = get_user_name_in_saml_body(token.data)
			user = find_user(user_name)
			return build_token(user, settings)
		else:
			raise_401("Invalid signature")
